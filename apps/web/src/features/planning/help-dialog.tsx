import { KavachApiError } from "@kavach/api-client";
import { useState, useEffect, useRef } from "react";
import type { ResponseBody, WaterExplainInput } from "@kavach/contracts";
import { usePlanning, planningApi, cls as c } from "./state";
import { planningCopy, cropNames } from "./planning-copy";
import { beginRecording } from "../demo/recorder";
export function HelpDialog({ close }: { close: () => void }) {
  const app = usePlanning(),
    t = planningCopy[app.locale],
    ref = useRef<HTMLDialogElement>(null);
  const voice = app.spoken,
    setVoice = app.setSpoken;
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [starting, setStarting] = useState(false),
    [error, setError] = useState(""),
    [answer, setAnswer] = useState<
      ResponseBody<"demoWaterExplain">["data"] | null
    >(null),
    [url, setUrl] = useState("");
  const lastRequest = useRef<{
    question: WaterExplainInput["question"];
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
    ref.current?.showModal();
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
    question: WaterExplainInput["question"],
    questionText?: string,
  ) {
    lastRequest.current = {
      question,
      ...(questionText ? { text: questionText } : {}),
    };
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setBusy(true);
    setError("");
    setAnswer(null);
    setUrl("");
    const label =
      questionText ||
      (question === "explain-coverage"
        ? t.qCoverage
        : question === "explain-assumptions"
          ? t.qAssumptions
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
      const response = await planningApi.waterExplain(
        {
          ...app.input,
          locale: app.locale,
          voice,
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
          },
        ]);
      }
      if (response.data.audio.status === "available") {
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
      if (alive.current && !ctrl.signal.aborted) setBusy(false);
    }
  }
  async function finish() {
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
      setText(result.data.transcript);
    } catch (e) {
      if (alive.current && !ctrl.signal.aborted) setError(message(e));
    } finally {
      if (alive.current && !ctrl.signal.aborted) setBusy(false);
    }
  }
  async function record() {
    if (recording) {
      await finish();
      return;
    }
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
      setRecording(true);
      timer.current = setTimeout(() => {
        void finish();
      }, 29000);
    } catch {
      if (alive.current) setError(t.noVoice);
    } finally {
      if (alive.current) setStarting(false);
    }
  }
  return (
    <dialog ref={ref} className={c("help-modal")} onClose={close}>
      <div className={c("dialog-inner")}>
        <div className={c("dialog-title")}>
          <h2>{t.helpTitle}</h2>
          <button aria-label={t.close} onClick={close}>
            ✕
          </button>
        </div>
        <p className={c("muted small help-context")}>
          {cropNames[app.locale][app.input.crop]} ·{" "}
          {app.input.regionId[0]!.toUpperCase() + app.input.regionId.slice(1)}
        </p>
        {!app.chat.length && <p className={c("muted small")}>{t.helpIntro}</p>}
        <details className={c("help-suggestions")} open={!app.chat.length}>
          <summary>
            {app.locale === "mr-IN"
              ? "सुचवलेले प्रश्न"
              : app.locale === "hi-IN"
                ? "सुझाए गए सवाल"
                : "Suggested questions"}
          </summary>
          <div className={c("help-options")}>
            {(
              [
                ["explain-coverage", t.qCoverage],
                ["explain-assumptions", t.qAssumptions],
                ["explain-next-checks", t.qChecks],
              ] as const
            ).map(([q, label]) => (
              <button
                key={q}
                disabled={busy || recording || starting}
                onClick={() => void ask(q)}
              >
                {label}
              </button>
            ))}
          </div>
        </details>
        <div
          ref={thread}
          className={c("help-thread")}
          role="log"
          aria-label="Conversation"
        >
          {app.chat.map((row) => (
            <div
              key={row.id}
              className={c(
                row.role === "user" ? "user-message" : "assistant-message",
              )}
              lang={row.locale}
            >
              <p>{row.text}</p>
              {row.model && (
                <small className={c("muted")}>Google · {row.model}</small>
              )}
            </div>
          ))}
        </div>
        <form
          className={c("stack")}
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) void ask("explain-coverage", text.trim());
          }}
        >
          <label>
            {t.question}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1200}
              rows={2}
              disabled={busy || recording}
            />
          </label>
          <div className={c("cta-row")}>
            <button
              type="button"
              className={c(recording ? "primary" : "secondary")}
              disabled={busy || starting}
              onClick={() => void record()}
            >
              {recording ? t.finish : t.record}
            </button>
            <button
              className={c("primary")}
              disabled={busy || recording || starting || !text.trim()}
            >
              {t.send}
            </button>
          </div>
          <label className={c("check")}>
            <input
              type="checkbox"
              checked={voice}
              onChange={(e) => setVoice(e.target.checked)}
            />
            {t.voice}
          </label>
        </form>
        {recording && <p role="status">{t.recording}</p>}
        {busy && <p role="status">{t.thinking}</p>}
        {error && (
          <p role="alert" className={c("notice")}>
            {error}
            {lastRequest.current && (
              <button
                disabled={busy}
                onClick={() => {
                  const last = lastRequest.current;
                  if (last) void ask(last.question, last.text);
                }}
              >
                {t.retry}
              </button>
            )}
          </p>
        )}
        {answer && (answer.explanation.status === "unavailable" || voice) && (
          <div className={c("reply")} role="status">
            {answer.explanation.status === "unavailable" && (
              <>
                <p>{answer.explanation.reason}</p>
                {answer.explanation.retryable && lastRequest.current && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      const last = lastRequest.current;
                      if (last) void ask(last.question, last.text);
                    }}
                  >
                    {t.retry}
                  </button>
                )}
              </>
            )}
            {url && (
              <audio
                controls
                autoPlay
                src={url}
                preload="auto"
                aria-label={t.play}
              />
            )}{" "}
            {voice &&
              answer.explanation.status === "available" &&
              answer.audio.status === "unavailable" && (
                <p className={c("small")}>{t.noAudio}</p>
              )}
          </div>
        )}
      </div>
    </dialog>
  );
}
