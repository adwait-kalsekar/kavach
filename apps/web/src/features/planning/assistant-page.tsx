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
    thread.current?.scrollTo({ top: thread.current.scrollHeight });
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
      (question === "season"
        ? seasonCopy[app.locale].talk
        : question === "history"
          ? seasonCopy[app.locale].history
          : t.qChecks);
    app.setChat((rows) => [
      ...rows.slice(-11),
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
          history: app.chat
            .slice(-6)
            .map((row) => ({ role: row.role, text: row.text.slice(0, 600) })),
          ...(questionText ? { text: questionText } : {}),
        },
        ctrl.signal,
      );
      if (!alive.current || ctrl.signal.aborted) return;
      setAnswer(response.data);
      if (response.data.explanation.status === "available") {
        const explanation = response.data.explanation;
        app.setChat((rows) => [
          ...rows.slice(-11),
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: explanation.summary,
            locale: app.locale,
            model: explanation.model.id,
            seasonAnswer: {
              assessment: response.data.assessment,
              views: response.data.components.views,
              ...(response.data.waterPlan
                ? { waterPlan: response.data.waterPlan }
                : {}),
            },
          },
        ]);
      }
      if (response.data.explanation.status !== "available")
        app.setChat((rows) => [
          ...rows.slice(-11),
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: seasonCopy[app.locale].context,
            locale: app.locale,
            seasonAnswer: {
              assessment: response.data.assessment,
              views: response.data.components.views,
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
            {cropNames[app.locale][app.input.crop]} ·{" "}
            {app.input.regionId[0]!.toUpperCase() + app.input.regionId.slice(1)}
          </p>
        </div>
      </header>
      <div
        ref={thread}
        className={c("conversation")}
        role="log"
        aria-label="Conversation"
      >
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
              {(
                [
                  ["season", seasonCopy[app.locale].talk],
                  ["history", seasonCopy[app.locale].history],
                  ["actions", t.qChecks],
                ] as const
              ).map(([q, label]) => (
                <button
                  disabled={busy || recording || starting}
                  key={q}
                  onClick={() => void ask(q)}
                >
                  {label}
                  <Icon name="arrow" size={17} />
                </button>
              ))}
            </div>
          </div>
        )}
        {app.chat.map((row) => (
          <div
            key={row.id}
            className={c(
              row.role === "user" ? "user-message" : "assistant-message",
            )}
            lang={row.locale}
          >
            <p>{row.text}</p>
            {row.seasonAnswer ? (
              <SeasonCards
                assessment={row.seasonAnswer.assessment}
                views={row.seasonAnswer.views}
                waterPlan={row.seasonAnswer.waterPlan}
              />
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
        {busy && (
          <p className={c("thinking")} role="status">
            {t.thinking}
          </p>
        )}
        {error && (
          <div className={c("notice")} role="alert">
            {error}
            {lastRequest.current && (
              <button
                disabled={busy || recording || starting}
                onClick={() => {
                  const last = lastRequest.current;
                  if (last) void ask(last.question, last.text, last.fromVoice);
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
                  if (last) void ask(last.question, last.text, last.fromVoice);
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
  );
}
