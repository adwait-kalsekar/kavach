import { chatCopy } from "./chat-copy";
import { SeasonCards } from "./season-cards";
import { seasonCopy } from "./season-copy";
import { KavachApiError } from "@kavach/api-client";
import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { ResponseBody, SeasonExplainInput } from "@kavach/contracts";
import { usePlanning, planningApi, cls as c } from "./state";
import { planningCopy, cropNames } from "./planning-copy";
import { beginRecording } from "../demo/recorder";
import { Icon } from "../demo/ui";
export function AssistantRoute() {
  const app = usePlanning();
  return (
    <AssistantPage
      key={
        app.locale + JSON.stringify(app.seasonInput) + JSON.stringify(app.input)
      }
    />
  );
}
export function AssistantPage() {
  const app = usePlanning(),
    t = planningCopy[app.locale];
  const region =
    app.catalog.data?.data.regions.find((r) => r.id === app.input.regionId)
      ?.name || app.input.regionId;
  const copy = chatCopy(app.locale, app.seasonInput, region);
  const [showQuestions, setShowQuestions] = useState(false);
  const index = useRef<HTMLElement>(null);
  useEffect(() => {
    if (showQuestions) {
      index.current?.scrollIntoView({ block: "start" });
      index.current?.focus({ preventScroll: true });
    }
  }, [showQuestions]);
  const [voiceReply, setVoiceReply] = useState(false);
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [starting, setStarting] = useState(false),
    [error, setError] = useState(""),
    [answer, setAnswer] = useState<
      ResponseBody<"demoReadinessExplain">["data"] | null
    >(null),
    [url, setUrl] = useState("");
  const mode = useRef<
    "idle" | "starting" | "recording" | "transcribing" | "answering"
  >("idle");
  const lastRequest = useRef<{
    question: SeasonExplainInput["question"];
    fromVoice: boolean;
    text?: string;
  } | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = thread.current;
    if (!container) return;
    const last = container.querySelector("[data-message]:last-of-type");
    if (last)
      container.scrollTo({
        top: Math.max(0, (last as HTMLElement).offsetTop - 20),
        behavior: "smooth",
      });
  }, [app.chat.length, busy]);
  const controller = useRef<AbortController | null>(null),
    recorder = useRef<Awaited<ReturnType<typeof beginRecording>> | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      void recorder.current?.stop();
    };
  }, []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  const message = (e: unknown) =>
    e instanceof KavachApiError
      ? e.message
      : app.locale === "mr-IN"
        ? "उत्तर मिळाले नाही. तुमची तुलना इथेच आहे. पुन्हा प्रयत्न करा."
        : app.locale === "hi-IN"
          ? "जवाब नहीं मिला। आपकी तुलना यहीं है। फिर कोशिश करें।"
          : "We could not get a reply. Your comparison is still here. Try again.";
  async function ask(
    question: SeasonExplainInput["question"],
    questionText?: string,
    fromVoice = false,
  ) {
    if (
      mode.current !== "idle" &&
      !(fromVoice && mode.current === "transcribing")
    )
      return;
    mode.current = "answering";
    lastRequest.current = {
      question,
      fromVoice,
      ...(questionText ? { text: questionText } : {}),
    };
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setBusy(true);
    setError("");
    setAnswer(null);
    setVoiceReply(fromVoice);
    setUrl("");
    const label =
      questionText ||
      copy.suggestions.find((s) => s.question === question)?.text ||
      t.qChecks;
    app.setChat((rows) => [
      ...rows.slice(-79),
      {
        id: crypto.randomUUID(),
        role: "user",
        text: label,
        locale: app.locale,
      },
    ]);
    setText("");
    try {
      const response = await planningApi.readinessExplain(
        {
          ...app.seasonInput,
          water: app.input,
          locale: app.locale,
          voice: fromVoice,
          question,
          history: app.chat.slice(-6).map((row) => ({
            role: row.role,
            text: row.text.slice(0, 600),
          })),
          ...(questionText ? { text: questionText } : {}),
        },
        ctrl.signal,
      );
      if (!alive.current || ctrl.signal.aborted) return;
      setAnswer(response.data);
      if (response.data.explanation.status === "available") {
        const explanation = response.data.explanation;
        app.setChat((rows) => [
          ...rows.slice(-79),
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: explanation.summary,
            locale: app.locale,
            model: explanation.model.id,
            seasonAnswer: {
              assessment: response.data.assessment,
              views: response.data.components.views,
              replyStyle: response.data.components.replyStyle,
              ...(response.data.waterPlan
                ? { waterPlan: response.data.waterPlan }
                : {}),
            },
          },
        ]);
      }
      if (response.data.explanation.status !== "available")
        app.setChat((rows) => [
          ...rows.slice(-79),
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: copy.fallback,
            locale: app.locale,
            seasonAnswer: {
              assessment: response.data.assessment,
              views: response.data.components.views,
              replyStyle: response.data.components.replyStyle,
              ...(response.data.waterPlan
                ? { waterPlan: response.data.waterPlan }
                : {}),
            },
          },
        ]);
      if (fromVoice && response.data.audio.status === "available") {
        const audio = response.data.audio;
        setUrl(
          URL.createObjectURL(
            new Blob(
              [Uint8Array.from(atob(audio.base64), (x) => x.charCodeAt(0))],
              { type: audio.mime },
            ),
          ),
        );
      }
    } catch (e) {
      if (alive.current && !ctrl.signal.aborted) setError(message(e));
    } finally {
      if (alive.current && !ctrl.signal.aborted) {
        mode.current = "idle";
        setBusy(false);
      }
    }
  }
  async function finish() {
    if (mode.current !== "recording") return;
    mode.current = "transcribing";
    if (timer.current) clearTimeout(timer.current);
    const rec = recorder.current;
    recorder.current = null;
    setRecording(false);
    if (!rec) return;
    setBusy(true);
    const ctrl = new AbortController();
    controller.current = ctrl;
    try {
      const blob = await rec.stop();
      if (!alive.current) return;
      if (!blob) throw new Error(t.noVoice);
      const result = await planningApi.planningTranscribe(
        blob,
        app.locale,
        ctrl.signal,
      );
      if (!alive.current || ctrl.signal.aborted) return;
      if (result.data.status === "unavailable")
        throw new Error(result.data.reason);
      await ask("season", result.data.transcript, true);
    } catch (e) {
      if (alive.current && !ctrl.signal.aborted) setError(message(e));
    } finally {
      if (alive.current && !ctrl.signal.aborted) {
        mode.current = "idle";
        setBusy(false);
      }
    }
  }
  function cancelRecording() {
    mode.current = "idle";
    if (timer.current) clearTimeout(timer.current);
    const rec = recorder.current;
    recorder.current = null;
    setRecording(false);
    void rec?.stop().catch(() => {});
  }
  async function record() {
    if (mode.current === "recording") {
      await finish();
      return;
    }
    if (mode.current !== "idle") return;
    mode.current = "starting";
    setAnswer(null);
    lastRequest.current = null;
    setError("");
    setStarting(true);
    setUrl("");
    try {
      const rec = await beginRecording();
      if (!alive.current) {
        await rec.stop();
        return;
      }
      recorder.current = rec;
      mode.current = "recording";
      setRecording(true);
      timer.current = setTimeout(() => {
        void finish();
      }, 29000);
    } catch {
      if (alive.current) {
        mode.current = "idle";
        setError(t.noVoice);
      }
    } finally {
      if (alive.current) setStarting(false);
    }
  }
  return (
    <div className={c("talk-layout")}>
      <aside className={c("chat-history")} aria-label={copy.recent}>
        <h2>{copy.recent}</h2>
        <p className={c("small muted")}>{copy.historyNote}</p>
        <nav>
          {app.chat
            .filter((row) => row.role === "user")
            .map((row, i) => (
              <button
                key={row.id}
                onClick={() =>
                  document
                    .getElementById("message-" + row.id)
                    ?.scrollIntoView({ block: "start", behavior: "smooth" })
                }
              >
                <span>{i + 1}</span>
                {row.text}
              </button>
            ))}
        </nav>
      </aside>
      <section className={c("talk-window")} aria-label={t.helpTitle}>
        <header className={c("talk-header")}>
          <div>
            <h1>
              {app.locale === "mr-IN"
                ? "कवचशी बोला"
                : app.locale === "hi-IN"
                  ? "कवच से बात करें"
                  : "Talk to Kavach"}
            </h1>
            <p>
              {cropNames[app.locale][app.input.crop]} · {region} ·{" "}
              {copy.irrigation}
            </p>
          </div>
          <div className={c("chat-tools")}>
            <Link to="/situation">{copy.change}</Link>
            <button
              className={c("chat-history-toggle")}
              onClick={() => setShowQuestions((v) => !v)}
              aria-expanded={showQuestions}
              aria-controls="visit-question-index"
            >
              {copy.recent} (
              {app.chat.filter((row) => row.role === "user").length})
            </button>
          </div>
        </header>
        <div
          ref={thread}
          className={c("conversation")}
          role="log"
          aria-label="Conversation"
        >
          {showQuestions && (
            <nav
              ref={index}
              id="visit-question-index"
              tabIndex={-1}
              className={c("mobile-question-index")}
              aria-label={copy.recent}
            >
              <p className={c("small muted")}>{copy.historyNote}</p>
              {app.chat
                .filter((row) => row.role === "user")
                .map((row) => (
                  <button
                    key={row.id}
                    onClick={() => {
                      setShowQuestions(false);
                      requestAnimationFrame(() =>
                        document
                          .getElementById("message-" + row.id)
                          ?.scrollIntoView({
                            block: "start",
                            behavior: "smooth",
                          }),
                      );
                    }}
                  >
                    {row.text}
                  </button>
                ))}
            </nav>
          )}
          {!app.chat.length && (
            <div className={c("talk-welcome")}>
              <div className={c("talk-mark")}>
                <Icon name="leaf" size={38} />
              </div>
              <h2>
                {app.locale === "mr-IN"
                  ? "चला, तुमची योजना समजून घेऊया."
                  : app.locale === "hi-IN"
                    ? "आइए, आपकी योजना समझें।"
                    : "Let's work through your plan."}
              </h2>
              <p>
                {app.locale === "en-IN"
                  ? "Ask about your season, past El Niño years, crop checks or water options. Type for text and evidence cards. Use the microphone for a spoken reply too."
                  : app.locale === "mr-IN"
                    ? "हंगाम, मागील वर्षे किंवा शेत तपासण्यांबद्दल विचारा. लिहिलेल्या प्रश्नांना मजकूर आणि माहितीची कार्डे मिळतात. बोलून प्रश्न विचारल्यास आवाजातही उत्तर मिळते."
                    : "अपने मौसम, पिछले वर्षों या खेत की जाँच के बारे में पूछें। लिखे प्रश्नों का जवाब पाठ और जानकारी के कार्ड में मिलता है। माइक्रोफोन से पूछने पर आवाज़ में भी जवाब मिलता है।"}
              </p>
              <div className={c("question-pills")}>
                {copy.suggestions.map((s) => (
                  <button
                    disabled={busy || recording || starting}
                    key={s.question}
                    onClick={() => void ask(s.question, s.text)}
                  >
                    <span className={c("prompt-symbol")} aria-hidden="true">
                      {s.symbol}
                    </span>
                    <span>
                      <strong>{s.title}</strong>
                      <span>{s.text}</span>
                    </span>
                    <Icon name="arrow" size={17} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {app.chat.map((row) => (
            <div
              key={row.id}
              id={"message-" + row.id}
              data-message
              tabIndex={-1}
              className={c(
                row.role === "user" ? "user-message" : "assistant-message",
              )}
              lang={row.locale}
            >
              <p>{row.text}</p>
              {row.model && row.id === app.chat.at(-1)?.id && !busy ? (
                <div className={c("reply-actions")}>
                  <button
                    disabled={recording || starting}
                    onClick={() =>
                      void ask(
                        "season",
                        app.locale === "en-IN"
                          ? "Give me a one-liner about what you just said"
                          : app.locale === "mr-IN"
                            ? "हे एका ओळीत सांगा"
                            : "इसे एक वाक्य में बताएँ",
                      )
                    }
                  >
                    {app.locale === "en-IN"
                      ? "One-line summary"
                      : app.locale === "mr-IN"
                        ? "एका ओळीत"
                        : "एक वाक्य में"}
                  </button>
                  <button
                    disabled={recording || starting}
                    onClick={() =>
                      void ask(
                        "season",
                        app.locale === "en-IN"
                          ? "Explain what you just said to me simply"
                          : app.locale === "mr-IN"
                            ? "हे सोप्या भाषेत समजावून सांगा"
                            : "इसे सरल भाषा में समझाएँ",
                      )
                    }
                  >
                    {app.locale === "en-IN"
                      ? "Explain simply"
                      : app.locale === "mr-IN"
                        ? "सोप्या भाषेत"
                        : "सरल भाषा में"}
                  </button>
                </div>
              ) : null}
              {row.seasonAnswer ? (
                row.seasonAnswer.replyStyle &&
                row.seasonAnswer.replyStyle !== "standard" ? (
                  <details className={c("reply-evidence")}>
                    <summary>
                      {app.locale === "en-IN"
                        ? "Show supporting evidence"
                        : app.locale === "mr-IN"
                          ? "आधारभूत माहिती दाखवा"
                          : "समर्थन में जानकारी दिखाएँ"}
                    </summary>
                    <SeasonCards
                      assessment={row.seasonAnswer.assessment}
                      views={row.seasonAnswer.views}
                      waterPlan={row.seasonAnswer.waterPlan}
                    />
                  </details>
                ) : (
                  <SeasonCards
                    assessment={row.seasonAnswer.assessment}
                    views={row.seasonAnswer.views}
                    waterPlan={row.seasonAnswer.waterPlan}
                  />
                )
              ) : null}
              {row.model && (
                <small>
                  {app.locale === "en-IN"
                    ? "Kavach · Google AI"
                    : "कवच · Google AI"}
                </small>
              )}
            </div>
          ))}
          {app.chat.length > 0 && !busy && !recording && !starting ? (
            <details className={c("followup-prompts")}>
              <summary>{copy.next}</summary>
              <div className={c("question-pills")}>
                {copy.suggestions.map((s) => (
                  <button
                    key={s.question}
                    onClick={() => void ask(s.question, s.text)}
                  >
                    {s.title}
                    <Icon name="arrow" size={17} />
                  </button>
                ))}
              </div>
            </details>
          ) : null}
          {busy && (
            <p className={c("thinking")} role="status">
              {t.thinking}
            </p>
          )}
          {error && (
            <div className={c("notice")} role="alert">
              <p>{error}</p>
              {app.season.data?.data ? (
                <SeasonCards
                  assessment={app.season.data.data}
                  views={[
                    lastRequest.current?.question === "protection"
                      ? "insurance-check"
                      : lastRequest.current?.question === "history"
                        ? "rain-history"
                        : lastRequest.current?.question === "water"
                          ? "water-comparison"
                          : "crop-actions",
                  ]}
                  waterPlan={app.plan.data?.data}
                />
              ) : null}
              <Link to="/situation">
                {app.locale === "en-IN"
                  ? "View evidence without AI"
                  : seasonCopy[app.locale].overview}{" "}
                →
              </Link>
              {lastRequest.current && (
                <button
                  disabled={busy || recording || starting}
                  onClick={() => {
                    const last = lastRequest.current;
                    if (last)
                      void ask(last.question, last.text, last.fromVoice);
                  }}
                >
                  {t.retry}
                </button>
              )}
            </div>
          )}
          {answer?.explanation.status === "unavailable" && (
            <div className={c("notice")} role="status">
              <p>{answer.explanation.reason}</p>
              {answer.explanation.retryable && (
                <button
                  disabled={busy || recording || starting}
                  onClick={() => {
                    const last = lastRequest.current;
                    if (last)
                      void ask(last.question, last.text, last.fromVoice);
                  }}
                >
                  {t.retry}
                </button>
              )}
            </div>
          )}
          {url && voiceReply && (
            <audio
              controls
              autoPlay
              src={url}
              preload="auto"
              aria-label={t.play}
            />
          )}
          {voiceReply &&
            answer?.explanation.status === "available" &&
            answer.audio.status === "unavailable" && (
              <p className={c("small muted")}>{t.noAudio}</p>
            )}
        </div>
        <div className={c("talk-composer")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) void ask("season", text.trim());
            }}
          >
            <label className="sr-only" htmlFor="plan-question">
              {t.question}
            </label>
            <textarea
              id="plan-question"
              placeholder={
                app.locale === "en-IN" ? "Type your question…" : t.question
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1200}
              rows={1}
              disabled={busy || recording || starting}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  if (text.trim() && !busy && !recording && !starting)
                    void ask("season", text.trim());
                }
              }}
            />
            <button
              type="button"
              className={c(recording ? "record-active" : "mic-button")}
              disabled={busy || starting}
              aria-label={recording ? t.finish : t.record}
              onClick={() => void record()}
            >
              <Icon name={recording ? "check" : "mic"} size={23} />
            </button>
            <button
              className={c("send-button")}
              disabled={busy || recording || starting || !text.trim()}
              aria-label={t.send}
            >
              <Icon name="arrow" size={22} />
            </button>
          </form>
          <div className={c("composer-hint")}>
            <span role="status">
              {recording
                ? t.recording
                : app.locale === "en-IN"
                  ? "Tap the mic to speak. Tap again when you're done."
                  : t.record}
            </span>
            {recording && (
              <button
                type="button"
                className={c("cancel-recording")}
                onClick={cancelRecording}
              >
                {t.cancel}
              </button>
            )}
            <Link to="/compare">
              {app.locale === "en-IN" ? "Your comparison" : t.compare}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
