import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createDemoClient, KavachApiError } from "@kavach/api-client";
import type {
  AudioResult,
  DemoLocale,
  VoiceIntent,
  ResponseBody,
} from "@kavach/contracts";
import { copy } from "./copy";
import { beginRecording } from "./recorder";
const api = createDemoClient(window.__KAVACH_CONFIG__?.apiOrigin || "");
const scenarioId = "latur-chickpea-limited-water" as const;
type Water = "none" | "one" | "assured";
type Reply = ResponseBody<"demoExplain">["data"];
const languages = {
  "en-IN": "English",
  "hi-IN": "हिन्दी",
  "mr-IN": "मराठी",
} as const;
function Icon({
  name,
}: {
  name: "mic" | "leaf" | "sound" | "water" | "arrow";
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "mic" ? (
        <>
          <rect x="9" y="2" width="6" height="13" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
        </>
      ) : name === "leaf" ? (
        <>
          <path d="M20 3C7 1 2 9 6 15c5 6 14 0 14-12Z" />
          <path d="m4 21 11-12" />
        </>
      ) : name === "sound" ? (
        <>
          <path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" />
        </>
      ) : name === "water" ? (
        <path d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13ZM8 15a4 4 0 0 0 4 4" />
      ) : (
        <path d="M4 12h16m-6-6 6 6-6 6" />
      )}
    </svg>
  );
}
function Landscape() {
  return (
    <svg
      className="landscape"
      viewBox="0 0 600 270"
      role="img"
      aria-label="Illustrated fields and hills near Latur"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#e8efdf" />
          <stop offset="1" stopColor="#fcf4d8" />
        </linearGradient>
      </defs>
      <path fill="url(#sky)" d="M0 0h600v270H0z" />
      <circle cx="454" cy="71" r="34" fill="#e9c77b" />
      <path d="M0 132Q70 58 166 123T350 130T600 112v158H0" fill="#c8d5b4" />
      <path d="M0 165q160-78 320 5t280-5v105H0" fill="#9fb98d" />
      <path d="M0 210q250-142 600-2v62H0" fill="#75935d" />
      <path d="M0 257q280-132 600-19v32H0" fill="#496d4d" />
      <path
        d="M370 164q-48 49-15 106"
        stroke="#e8d5a6"
        strokeWidth="18"
        fill="none"
      />
      <g stroke="#dbe5be" fill="none" strokeWidth="2" opacity=".55">
        <path d="M0 224q132-69 288-39M0 238q134-73 294-41M417 203q110-2 183 35M412 217q108 0 188 36" />
      </g>
      <path
        d="M112 155v-39m0 17q-28 1-23-22 20-2 23 22m0-9q26 0 20-24-18 2-20 24"
        fill="#31583d"
        stroke="#31583d"
        strokeWidth="3"
      />
      <g fill="#48664b">
        <path d="m516 155 20-18 20 18v24h-40z" />
        <path d="M530 157h9v22h-9z" fill="#d2c79c" />
      </g>
      <path d="M516 155h40l-20-18z" fill="#a97951" />
    </svg>
  );
}
export function DemoPage() {
  const [locale, setLocale] = useState<DemoLocale>("en-IN");
  const t = copy[locale];
  const [water, setWater] = useState<Water>("one");
  const [sheet, setSheet] = useState<"water" | "sources" | "language" | null>(
    null,
  );
  const [proposal, setProposal] = useState<VoiceIntent | null>(null);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [notice, setNotice] = useState("");
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const recorder = useRef<Awaited<ReturnType<typeof beginRecording>> | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const scenarios = useQuery({
    queryKey: ["demo", "scenarios"],
    queryFn: ({ signal }) => api.scenarios(signal),
    staleTime: Infinity,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const assessment = useQuery({
    queryKey: ["demo", "assess", water],
    queryFn: ({ signal }) =>
      api.assess({ scenarioId, changes: { irrigation: water } }, signal),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const explain = useMutation({
    mutationFn: (args: {
      water: Water;
      locale: DemoLocale;
      signal: AbortSignal;
    }) =>
      api.explain(
        {
          scenarioId,
          changes: { irrigation: args.water },
          locale: args.locale,
          question: args.water === "one" ? "explain-checks" : "explain-change",
          voice: true,
        },
        args.signal,
      ),
    retry: false,
  });
  const transcribe = useMutation({
    mutationFn: (args: {
      blob: Blob;
      locale: DemoLocale;
      signal: AbortSignal;
    }) => api.transcribe(args.blob, args.locale, args.signal),
    retry: false,
  });
  const busy = explain.isPending || transcribe.isPending;
  const label = (value: Water) => t[value];
  const stopAudio = () => {
    audio.current?.pause();
  };
  const play = (value: AudioResult) => {
    if (value.status !== "available") return;
    const bytes = Uint8Array.from(atob(value.base64), (c) => c.charCodeAt(0));
    setAudioUrl(URL.createObjectURL(new Blob([bytes], { type: value.mime })));
  };
  useEffect(() => {
    if (!audioUrl) return;
    void audio.current?.play().catch(() => {});
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);
  useEffect(() => {
    if (sheet) dialog.current?.showModal();
    else dialog.current?.close();
  }, [sheet]);
  useEffect(() => {
    document.documentElement.lang = locale.slice(0, 2);
  }, [locale]);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      void recorder.current?.stop();
    },
    [],
  );
  const clearPending = () => {
    generation.current++;
    controller.current?.abort();
    stopAudio();
    setAudioUrl("");
    setNotice("");
    setProposal(null);
    setTranscript("");
    setReply(null);
  };
  const errorText = (error: unknown) =>
    error instanceof KavachApiError && error.status === 429
      ? error.message
      : t.loadError;
  async function ask() {
    clearPending();
    const version = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await explain.mutateAsync({
        water,
        locale,
        signal: abort.signal,
      });
      if (version !== generation.current) return;
      setReply(result.data);
      play(result.data.audio);
    } catch (error) {
      if (version === generation.current) setNotice(errorText(error));
    }
  }
  async function finish() {
    if (!recorder.current) return;
    const active = recorder.current;
    recorder.current = null;
    setRecording(false);
    if (timer.current) clearTimeout(timer.current);
    const version = generation.current;
    try {
      const blob = await active.stop();
      if (version !== generation.current) return;
      if (!blob) {
        setNotice(t.unsupported);
        return;
      }
      const abort = new AbortController();
      controller.current = abort;
      const result = await transcribe.mutateAsync({
        blob,
        locale,
        signal: abort.signal,
      });
      if (version !== generation.current) return;
      if (result.data.status === "unavailable") {
        setNotice(result.data.reason);
        return;
      }
      setTranscript(result.data.transcript);
      setProposal(result.data.proposed);
      play(result.data.audio);
    } catch (error) {
      if (version === generation.current) setNotice(errorText(error));
    }
  }
  async function toggleMic() {
    if (recording) {
      await finish();
      return;
    }
    if (starting) {
      clearPending();
      setStarting(false);
      return;
    }
    clearPending();
    setStarting(true);
    const version = generation.current;
    try {
      const active = await beginRecording();
      if (version !== generation.current) {
        await active.stop();
        return;
      }
      recorder.current = active;
      setStarting(false);
      setRecording(true);
      timer.current = setTimeout(() => {
        void finish();
      }, 30000);
    } catch {
      if (version === generation.current) {
        setStarting(false);
        setNotice(t.permission);
      }
    }
  }
  function confirm() {
    if (!proposal) return;
    if (proposal.intent === "change-irrigation" && proposal.irrigation) {
      clearPending();
      setWater(proposal.irrigation);
    } else if (
      proposal.intent === "explain-checks" ||
      proposal.intent === "explain-change"
    ) {
      setProposal(null);
      void ask();
    } else {
      setProposal(null);
      setNotice(t.unsupported);
    }
  }
  const currentAssessment =
    assessment.data?.data.comparison || assessment.data?.data.baseline;
  const actionCopy: Record<string, { title: string; detail: string }> = {
    "check-moisture": { title: t.field, detail: t.fieldBody },
    "limited-water": { title: t.one, detail: t.oneBody },
    "rainfed-check": { title: t.none, detail: t.noneBody },
    "irrigated-check": { title: t.assured, detail: t.assuredBody },
  };
  const climate = scenarios.data?.data.climate;
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <a href="/" className="wordmark" aria-label="Kavach home">
          <span className="brand-symbol">
            <Icon name="leaf" />
          </span>
          kavach<span className="wordmark-dot">.</span>
        </a>
        <button
          className="language-button"
          onClick={() => setSheet("language")}
          disabled={busy || recording || starting}
        >
          <span aria-hidden="true">अ / A</span>
          {languages[locale]}
          <span aria-hidden="true">⌄</span>
        </button>
      </header>
      <main id="main" className="journey">
        <section className="greeting">
          <div>
            <p className="eyebrow">
              {locale === "en-IN"
                ? "YOUR SEASON, A STEP AHEAD"
                : locale === "hi-IN"
                  ? "मौसम की तैयारी, एक कदम आगे"
                  : "हंगामाची तयारी, एक पाऊल पुढे"}
            </p>
            <h1>
              {t.hello}
              <br />
              <em>{t.title}</em>
            </h1>
            <p className="intro">{t.intro}</p>
          </div>
          <div className="greeting-mark" aria-hidden="true">
            ✳
          </div>
        </section>
        {scenarios.isPending ? (
          <p role="status" className="status-card">
            {t.loading}
          </p>
        ) : scenarios.isError ? (
          <div role="alert" className="status-card">
            {t.loadError}
            <button onClick={() => void scenarios.refetch()}>{t.retry}</button>
          </div>
        ) : (
          <>
            <section className="sample-card" aria-label={t.sample}>
              <Landscape />
              <div className="sample-content">
                <div className="sample-heading">
                  <span className="eyebrow">{t.sample}</span>
                  <span className="sample-dot" aria-hidden="true" />
                </div>
                <h2>{t.place}</h2>
                <p>{t.crop}</p>
                <div className="sample-tags">
                  <span>
                    <Icon name="water" />
                    {label(water)}
                  </span>
                  <span>◌ {t.moisture}</span>
                </div>
                <p className="sample-disclaimer">{t.synthetic}</p>
              </div>
            </section>
            <section
              className={"voice-space" + (recording ? " is-listening" : "")}
              aria-label={t.talk}
            >
              <div className="voice-orbit">
                <button
                  className="mic-button"
                  aria-label={
                    recording ? t.finish : starting ? t.cancel : t.talk
                  }
                  aria-pressed={recording}
                  onClick={() => void toggleMic()}
                  disabled={busy}
                >
                  {recording ? (
                    <span className="stop-icon" />
                  ) : (
                    <Icon name="mic" />
                  )}
                </button>
              </div>
              <h2 aria-live="polite">
                {recording
                  ? t.listening
                  : starting
                    ? locale === "en-IN"
                      ? "Allow your microphone to begin"
                      : locale === "hi-IN"
                        ? "शुरू करने के लिए माइक्रोफ़ोन की अनुमति दें"
                        : "सुरू करण्यासाठी मायक्रोफोनला परवानगी द्या"
                    : busy
                      ? t.thinking
                      : t.talk}
              </h2>
              <p>{recording ? t.finish : t.hint}</p>
              {recording && (
                <div className="wave" aria-hidden="true">
                  {Array.from({ length: 13 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
              )}
              <p className="voice-privacy">{t.voicePrivacy}</p>
              <div className="voice-divider">
                <span />
                {t.or}
                <span />
              </div>
              <div className="quick-actions">
                <button
                  disabled={busy || recording || starting}
                  onClick={() => setSheet("water")}
                >
                  <Icon name="water" />
                  {t.compare}
                  <Icon name="arrow" />
                </button>
                <button
                  disabled={busy || recording || starting}
                  onClick={() => void ask()}
                >
                  <Icon name="sound" />
                  {water === "one" ? t.explain : t.explainChange}
                  <Icon name="arrow" />
                </button>
              </div>
            </section>
            {notice && (
              <div className="inline-notice" role="status">
                {notice}
                <button onClick={() => setNotice("")} aria-label={t.close}>
                  ×
                </button>
              </div>
            )}
            {proposal && (
              <section className="confirmation-card" aria-live="polite">
                <p className="eyebrow">{t.heard}</p>
                <blockquote>“{transcript}”</blockquote>
                <h2>
                  {proposal.intent === "change-irrigation" &&
                  proposal.irrigation
                    ? label(proposal.irrigation)
                    : proposal.intent === "explain-checks" ||
                        proposal.intent === "explain-change"
                      ? t.explain
                      : t.unsupported}
                </h2>
                <p>{t.confirmation}</p>
                <div className="button-row">
                  {!["unsupported", "confirm", "change"].includes(
                    proposal.intent,
                  ) && (
                    <button className="primary" onClick={confirm}>
                      {t.confirm}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      stopAudio();
                      setProposal(null);
                      setTranscript("");
                    }}
                  >
                    {t.cancel}
                  </button>
                </div>
              </section>
            )}
            {reply && (
              <section className="reply-card" aria-live="polite">
                <div className="reply-heading">
                  <span className="assistant-avatar">
                    <Icon name="leaf" />
                  </span>
                  <span>
                    Kavach
                    <small>
                      {reply.explanation.status === "available"
                        ? t.google
                        : t.checks}
                    </small>
                  </span>
                </div>
                <p>
                  {reply.explanation.status === "available"
                    ? reply.explanation.summary
                    : reply.explanation.reason}
                </p>
                {reply.audio.status === "available" ? (
                  <button
                    className="listen-button"
                    onClick={() => {
                      void audio.current?.play().catch(() => {});
                    }}
                  >
                    <Icon name="sound" />
                    {t.replay}
                  </button>
                ) : (
                  <small>{t.voiceUnavailable}</small>
                )}
              </section>
            )}
            {assessment.isSuccess ? (
              <section className="checks-section">
                <div className="section-heading">
                  <h2>{t.checks}</h2>
                  <span>
                    {String(currentAssessment?.actions.length || 0).padStart(
                      2,
                      "0",
                    )}
                  </span>
                </div>
                {assessment.data.data.comparison && (
                  <p className="comparison-label">↔ {t.comparison}</p>
                )}
                {currentAssessment?.actions.map((action, index) => (
                  <article className="check-card" key={action.id}>
                    <span className="check-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <span className="check-label">
                        {action.id === "check-moisture"
                          ? locale === "en-IN"
                            ? "FIELD CHECK"
                            : locale === "hi-IN"
                              ? "खेत की जाँच"
                              : "शेताची तपासणी"
                          : t.water}
                      </span>
                      <h3>{actionCopy[action.id]?.title || action.title}</h3>
                      <p>{actionCopy[action.id]?.detail || action.detail}</p>
                    </div>
                    {action.id === "check-moisture" ? (
                      <span className="check-indicator" aria-hidden="true">
                        !
                      </span>
                    ) : (
                      <Icon name="water" />
                    )}
                  </article>
                ))}
                {water !== "one" && (
                  <button
                    className="reset-button"
                    onClick={() => {
                      clearPending();
                      setWater("one");
                    }}
                  >
                    {t.reset} ↗
                  </button>
                )}
              </section>
            ) : (
              <div className="status-card" role="status">
                {assessment.isPending ? t.loading : t.loadError}
                {assessment.isError && (
                  <button onClick={() => void assessment.refetch()}>
                    {t.retry}
                  </button>
                )}
              </div>
            )}
            <section className="climate-card">
              <div className="climate-top">
                <span className="climate-symbol" aria-hidden="true">
                  ☂
                </span>
                <span className="eyebrow">{t.climate}</span>
              </div>
              <h2>{t.historical}</h2>
              {climate?.status === "available" ? (
                <>
                  <div className="rainfall-stat">
                    <strong>
                      {Math.abs(climate.departurePct).toLocaleString(locale, {
                        maximumFractionDigits: 1,
                      })}
                      <span>%</span>
                    </strong>
                    <p>{t.below}</p>
                  </div>
                  <div className="rainfall-row">
                    <span>{t.baseline}</span>
                    <b>
                      {climate.baseline.meanMm.toLocaleString(locale, {
                        maximumFractionDigits: 1,
                      })}{" "}
                      mm
                    </b>
                    <meter
                      min={0}
                      max={climate.baseline.meanMm}
                      value={climate.baseline.meanMm}
                    />
                  </div>
                  <div className="rainfall-row current">
                    <span>{t.actual}</span>
                    <b>
                      {climate.totalMm.toLocaleString(locale, {
                        maximumFractionDigits: 1,
                      })}{" "}
                      mm
                    </b>
                    <meter
                      min={0}
                      max={climate.baseline.meanMm}
                      value={climate.totalMm}
                    />
                  </div>
                  <p className="climate-note">{t.regional}</p>
                </>
              ) : (
                <p>{climate?.reason || t.loadError}</p>
              )}
              <button
                className="source-link"
                onClick={() => setSheet("sources")}
              >
                {t.sources}
                <span>↗</span>
              </button>
            </section>
          </>
        )}
        <footer className="app-footer">
          <Icon name="leaf" />
          <p>{t.noSave}</p>
          <button onClick={() => setSheet("sources")}>{t.sources}</button>
          <span>Built with Google Cloud · POC</span>
        </footer>
      </main>
      <audio
        ref={audio}
        src={audioUrl || undefined}
        controls={!!audioUrl}
        className={audioUrl ? "audio-player" : "audio-hidden"}
        aria-label={t.listen}
      />
      <dialog
        ref={dialog}
        className="bottom-sheet"
        onCancel={() => setSheet(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSheet(null);
        }}
      >
        <div className="sheet-content">
          <div className="sheet-handle" />
          <button
            className="sheet-close"
            onClick={() => setSheet(null)}
            aria-label={t.close}
          >
            ×
          </button>
          {sheet === "language" ? (
            <>
              <p className="eyebrow">LANGUAGE / भाषा</p>
              <h2>{t.lang}</h2>
              <div className="choice-list">
                {(Object.keys(languages) as DemoLocale[]).map((value) => (
                  <button
                    key={value}
                    aria-pressed={locale === value}
                    onClick={() => {
                      clearPending();
                      setLocale(value);
                      setSheet(null);
                    }}
                  >
                    {languages[value]}
                    <span>{locale === value ? "✓" : "→"}</span>
                  </button>
                ))}
              </div>
            </>
          ) : sheet === "water" ? (
            <>
              <p className="eyebrow">{t.change}</p>
              <h2>{t.water}</h2>
              <p>{t.baselineWater}</p>
              <div className="choice-list">
                {(["none", "one", "assured"] as Water[]).map((value) => (
                  <button
                    key={value}
                    aria-pressed={water === value}
                    onClick={() => {
                      clearPending();
                      setProposal({
                        intent: "change-irrigation",
                        irrigation: value,
                      });
                      setTranscript(label(value));
                      setSheet(null);
                    }}
                  >
                    {label(value)}
                    <span>{water === value ? "✓" : "→"}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">{t.facts}</p>
              <h2>{t.limits}</h2>
              <p>{t.limitBody}</p>
              <h3>NASA POWER · MERRA-2</h3>
              <p>{t.sourceDesc}</p>
              {climate?.status === "available" && (
                <>
                  <p>
                    {t.date}:{" "}
                    {new Date(climate.retrievedAt).toLocaleDateString(locale)}
                  </p>
                  <a href={climate.sourceUrl} target="_blank" rel="noreferrer">
                    NASA POWER ↗
                  </a>
                </>
              )}
              <h3>ICAR-CRIDA · Latur, 2011</h3>
              <p>{scenarios.data?.data.sources[0]?.applicability}</p>
              <a
                href={scenarios.data?.data.sources[0]?.url}
                target="_blank"
                rel="noreferrer"
              >
                District context ↗
              </a>
              <h3>{t.talk}</h3>
              <p>{t.voicePrivacy}</p>
              {locale === "mr-IN" && <p>{t.voicePreview}</p>}
              <p className="source-version">
                Rules:{" "}
                {assessment.data?.data.baseline.ruleVersion || "unavailable"} ·
                Sample v1
              </p>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
