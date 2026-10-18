import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createDemoClient, KavachApiError } from "@kavach/api-client";
import type {
  AudioResult,
  DemoLocale,
  ResponseBody,
  VoiceIntent,
} from "@kavach/contracts";
import { beginRecording } from "./recorder";
import { copy } from "./copy";
import { conversationCopy } from "./conversation-copy";
export const demoApi = createDemoClient(
  window.__KAVACH_CONFIG__?.apiOrigin || "",
);
export const scenarioId = "latur-chickpea-limited-water" as const;
export type Water = "none" | "one" | "assured";
export const languages = {
  "en-IN": "English",
  "hi-IN": "हिन्दी",
  "mr-IN": "मराठी",
} as const;
export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  locale: DemoLocale;
  kind?: "proposal" | "context" | "error";
  water?: Water;
  fromWater?: Water;
  audio?: AudioResult;
  google?: boolean;
  retry?: string;
};
type Phase = "idle" | "starting" | "recording" | "interpreting" | "explaining";
function useAppState() {
  const [locale, setLocale] = useState<DemoLocale>("en-IN");
  const t = { ...copy[locale], ...conversationCopy[locale] };
  const [water, setWater] = useState<Water>("one");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [spoken, setSpoken] = useState(false);
  const [playbackNotice, setPlaybackNotice] = useState("");
  const [pending, setPendingState] = useState<{
    id: string;
    water: Water;
  } | null>(null);
  const pendingRef = useRef(pending);
  const setPending = (value: typeof pending) => {
    pendingRef.current = value;
    setPendingState(value);
  };
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const recorder = useRef<Awaited<ReturnType<typeof beginRecording>> | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationVisible = useRef(true);
  const player = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const scenarios = useQuery({
    queryKey: ["demo", "scenarios"],
    queryFn: ({ signal }) => demoApi.scenarios(signal),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const assessment = useQuery({
    queryKey: ["demo", "assess", water],
    queryFn: ({ signal }) =>
      demoApi.assess({ scenarioId, changes: { irrigation: water } }, signal),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const interpret = useMutation({
    mutationFn: ({
      text,
      voice,
      signal,
    }: {
      text: string;
      voice: boolean;
      signal: AbortSignal;
    }) => demoApi.message({ text, locale, voice }, signal),
    retry: false,
  });
  const speech = useMutation({
    mutationFn: ({ blob, signal }: { blob: Blob; signal: AbortSignal }) =>
      demoApi.transcribe(blob, locale, signal),
    retry: false,
  });
  const explain = useMutation({
    mutationFn: ({
      question,
      voice,
      signal,
    }: {
      question: "explain-checks" | "explain-change";
      voice: boolean;
      signal: AbortSignal;
    }) =>
      demoApi.explain(
        {
          scenarioId,
          changes: { irrigation: water },
          locale,
          question:
            question === "explain-change" && water === "one"
              ? "explain-checks"
              : question,
          voice,
        },
        signal,
      ),
    retry: false,
  });
  function append(message: Omit<Message, "id" | "locale">) {
    const id = crypto.randomUUID();
    setMessages((old) => {
      const retained = old.slice(-39);
      const audioCutoff = Math.max(0, retained.length - 7);
      return [
        ...retained.map((message, index) =>
          index < audioCutoff ? { ...message, audio: undefined } : message,
        ),
        { ...message, id, locale },
      ];
    });
    return id;
  }
  const stopAudio = useCallback(() => {
    player.current?.pause();
    setPlaying(null);
    setPlaybackNotice("");
  }, []);
  const setConversationVisible = useCallback(
    (visible: boolean) => {
      conversationVisible.current = visible;
      if (!visible) stopAudio();
    },
    [stopAudio],
  );
  function play(id: string, audio: AudioResult) {
    if (audio.status !== "available") return;
    if (playing === id && !player.current?.paused) {
      stopAudio();
      return;
    }
    stopAudio();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    const bytes = Uint8Array.from(atob(audio.base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: audio.mime }));
    audioUrl.current = url;
    if (player.current) {
      player.current.src = url;
      setPlaying(id);
      void player.current.play().catch(() => {
        setPlaying(null);
        setPlaybackNotice(t.audioBlocked);
      });
    }
  }
  function addAudio(message: Omit<Message, "id" | "locale">, voice: boolean) {
    const id = append(message);
    if (voice && message.audio && conversationVisible.current)
      play(id, message.audio);
    return id;
  }
  function cancel(announce = false) {
    generation.current++;
    controller.current?.abort();
    controller.current = null;
    if (timer.current) clearTimeout(timer.current);
    const active = recorder.current;
    recorder.current = null;
    void active?.stop();
    setPhase("idle");
    stopAudio();
    if (announce) append({ role: "assistant", text: t.cancelled });
  }
  function start() {
    generation.current++;
    controller.current?.abort();
    stopAudio();
    setPlaybackNotice("");
    const abort = new AbortController();
    controller.current = abort;
    return { version: generation.current, signal: abort.signal };
  }
  const errorText = (error: unknown) =>
    error instanceof KavachApiError && error.status === 429
      ? error.message
      : t.loadError;
  async function explanation(
    question: "explain-checks" | "explain-change",
    voice: boolean,
    version: number,
    signal: AbortSignal,
  ) {
    setPhase("explaining");
    const response = await explain.mutateAsync({ question, voice, signal });
    if (version !== generation.current) return;
    const value = response.data;
    addAudio(
      {
        role: "assistant",
        text:
          value.explanation.status === "available"
            ? value.explanation.summary
            : t.explainUnavailable,
        kind: value.explanation.status === "available" ? undefined : "error",
        google: value.explanation.status === "available",
        audio: value.audio,
      },
      voice,
    );
  }
  function propose(next: Water, voiceAudio?: AudioResult) {
    setPending(null);
    if (next === water) {
      append({ role: "assistant", text: t.same });
      return;
    }
    const id = addAudio(
      {
        role: "assistant",
        kind: "proposal",
        text: t.proposeTitle,
        water: next,
        fromWater: water,
        audio: voiceAudio,
      },
      !!voiceAudio,
    );
    setPending({ id, water: next });
  }
  function applyWater(next: Water) {
    cancel();
    setPending(null);
    setWater(next);
    append({
      role: "assistant",
      kind: "context",
      text: t.applied + " " + t.water + ": " + t[next],
    });
  }
  function confirm() {
    if (pendingRef.current) applyWater(pendingRef.current.water);
  }
  function keep() {
    setPending(null);
    stopAudio();
    append({ role: "assistant", text: t.keep });
  }
  async function handleIntent(
    value: ResponseBody<"demoMessage">["data"],
    voice: boolean,
    version: number,
    signal: AbortSignal,
  ) {
    if (value.status !== "available") {
      append({ role: "assistant", kind: "error", text: t.speechUnavailable });
      return;
    }
    const intent: VoiceIntent = value.proposed;
    if (intent.intent === "change-irrigation" && intent.irrigation) {
      propose(intent.irrigation, value.audio);
      return;
    }
    if (intent.intent === "confirm") {
      if (pendingRef.current) confirm();
      else append({ role: "assistant", text: t.unsupportedReply });
      return;
    }
    if (intent.intent === "change") {
      keep();
      return;
    }
    if (
      intent.intent === "explain-checks" ||
      intent.intent === "explain-change"
    ) {
      await explanation(intent.intent, voice, version, signal);
      return;
    }
    append({ role: "assistant", text: t.unsupportedReply });
  }
  async function sendText(text: string) {
    text = text.trim();
    if (!text || text.length > 1200 || phase !== "idle") return;
    append({ role: "user", text });
    const { version, signal } = start();
    setPhase("interpreting");
    try {
      const response = await interpret.mutateAsync({
        text,
        voice: spoken,
        signal,
      });
      if (version !== generation.current) return;
      if (response.data.status === "unavailable") {
        append({
          role: "assistant",
          kind: "error",
          text: t.messageUnavailable,
          retry: text,
        });
        return;
      }
      await handleIntent(response.data, spoken, version, signal);
    } catch (error) {
      if (version === generation.current)
        append({
          role: "assistant",
          kind: "error",
          text: errorText(error),
          retry: text,
        });
    } finally {
      if (version === generation.current) setPhase("idle");
    }
  }
  async function ask(
    question: "explain-checks" | "explain-change" = "explain-checks",
  ) {
    if (phase !== "idle") return;
    append({
      role: "user",
      text: question === "explain-change" ? t.suggestChange : t.suggestCheck,
    });
    const { version, signal } = start();
    try {
      await explanation(question, spoken, version, signal);
    } catch (error) {
      if (version === generation.current)
        append({ role: "assistant", kind: "error", text: errorText(error) });
    } finally {
      if (version === generation.current) setPhase("idle");
    }
  }
  function chooseWater(next: Water) {
    if (phase !== "idle") return;
    stopAudio();
    append({ role: "user", text: t.water + ": " + t[next] });
    propose(next);
  }
  async function finish() {
    const active = recorder.current;
    if (!active) return;
    recorder.current = null;
    if (timer.current) clearTimeout(timer.current);
    setPhase("interpreting");
    const version = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    const id = append({ role: "user", text: t.voiceMessage });
    try {
      const blob = await active.stop();
      if (version !== generation.current) return;
      if (!blob) {
        append({ role: "assistant", kind: "error", text: t.speechUnavailable });
        return;
      }
      const response = await speech.mutateAsync({ blob, signal: abort.signal });
      if (version !== generation.current) return;
      if (response.data.status === "available") {
        const transcript = response.data.transcript;
        setMessages((old) =>
          old.map((m) => (m.id === id ? { ...m, text: transcript } : m)),
        );
      }
      await handleIntent(response.data, true, version, abort.signal);
    } catch (error) {
      if (version === generation.current)
        append({ role: "assistant", kind: "error", text: errorText(error) });
    } finally {
      if (version === generation.current) setPhase("idle");
    }
  }
  async function toggleMic() {
    if (phase === "recording") {
      await finish();
      return;
    }
    if (phase === "starting") {
      cancel();
      return;
    }
    if (phase !== "idle") return;
    const { version } = start();
    setPhase("starting");
    try {
      const active = await beginRecording();
      if (version !== generation.current) {
        await active.stop();
        return;
      }
      recorder.current = active;
      setPhase("recording");
      timer.current = setTimeout(() => {
        void finish();
      }, 30000);
    } catch {
      if (version === generation.current) {
        setPhase("idle");
        append({ role: "assistant", kind: "error", text: t.permission });
      }
    }
  }
  function changeLocale(next: DemoLocale) {
    if (next === locale) return;
    cancel();
    setPending(null);
    setLocale(next);
    if (messages.length)
      setMessages((old) => [
        ...old.slice(-39),
        {
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "context",
          text: conversationCopy[next].languageChanged,
          locale: next,
        },
      ]);
  }
  function newChat() {
    cancel();
    setPending(null);
    setMessages([]);
    setDraft("");
  }
  useEffect(() => {
    if (pending && !messages.some((message) => message.id === pending.id)) {
      pendingRef.current = null;
      setPendingState(null);
    }
  }, [messages, pending]);
  useEffect(() => {
    document.documentElement.lang = locale.slice(0, 2);
  }, [locale]);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      void recorder.current?.stop();
      player.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    },
    [],
  );
  return {
    locale,
    t,
    water,
    messages,
    draft,
    setDraft,
    phase,
    spoken,
    setSpoken,
    scenarios,
    assessment,
    pending,
    playing,
    playbackNotice,
    player,
    play,
    stopAudio,
    setConversationVisible,
    sendText,
    ask,
    chooseWater,
    applyWater,
    confirm,
    keep,
    toggleMic,
    cancel,
    changeLocale,
    newChat,
  };
}
type AppState = ReturnType<typeof useAppState>;
const Context = createContext<AppState | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  return (
    <Context value={state}>
      {children}
      <audio
        ref={state.player}
        onEnded={() => state.stopAudio()}
        className="audio-hidden"
      />
    </Context>
  );
}
export function useKavach() {
  const value = useContext(Context);
  if (!value) throw new Error("Kavach app context is missing");
  return value;
}
