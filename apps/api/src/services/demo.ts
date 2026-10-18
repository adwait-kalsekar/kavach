import { createHash, randomUUID } from "node:crypto";
import {
  climateSchema,
  demoScenarioId,
  explanationSchema,
  type DemoInput,
  type DemoExplainInput,
  type DemoAssessment,
  type DemoLocale,
  type Farm,
  type AudioResult,
} from "@kavach/contracts";
import { evaluate, RULE_VERSION, sourceReferences } from "@kavach/domain";
import snapshot from "../evidence/latur-rainfall.json" with { type: "json" };
import type { Store } from "../ports/store.js";
import {
  EXPLANATION_VERSION,
  type ExplanationProvider,
} from "../ports/explanation.js";
import type { SpeechProvider } from "../ports/speech.js";
import type { Config } from "../config.js";
import { ServiceError } from "../errors.js";

const climate = climateSchema.parse(snapshot);
const context = {
  district: "Latur",
  crop: "chickpea",
  stage: "planning",
  irrigation: "one",
  moisture: "unknown",
  seedAvailable: true,
  language: "en",
} as const;
const silence: AudioResult = {
  status: "unavailable",
  reason: "Voice playback was not requested.",
  retryable: false,
};
const confirmation = {
  "en-IN": {
    none: "You said no irrigation. Is that right?",
    one: "You said one irrigation. Is that right?",
    assured: "You said dependable irrigation. Is that right?",
    other:
      "Please confirm the request on screen. You can change irrigation or ask about the checks.",
  },
  "hi-IN": {
    none: "आपने कहा सिंचाई उपलब्ध नहीं है। क्या यह सही है?",
    one: "आपने कहा एक सिंचाई उपलब्ध है। क्या यह सही है?",
    assured: "आपने कहा भरोसेमंद सिंचाई उपलब्ध है। क्या यह सही है?",
    other:
      "कृपया स्क्रीन पर अनुरोध की पुष्टि करें। आप सिंचाई बदल सकते हैं या जाँच के बारे में पूछ सकते हैं।",
  },
  "mr-IN": {
    none: "तुम्ही म्हणालात सिंचन उपलब्ध नाही. हे बरोबर आहे का?",
    one: "तुम्ही म्हणालात एक सिंचन उपलब्ध आहे. हे बरोबर आहे का?",
    assured: "तुम्ही म्हणालात खात्रीशीर सिंचन उपलब्ध आहे. हे बरोबर आहे का?",
    other:
      "कृपया स्क्रीनवरील विनंतीची पुष्टी करा. तुम्ही सिंचन बदलू शकता किंवा तपासण्यांबद्दल विचारू शकता.",
  },
};
export class DemoService {
  constructor(
    private store: Store,
    private config: Config,
    private explanation: ExplanationProvider,
    private speech: SpeechProvider,
    private now: () => Date,
  ) {}
  scenarios() {
    return {
      demo: true,
      persisted: false,
      scenarioId: demoScenarioId,
      scenarioVersion: 1,
      label: "Synthetic Latur chickpea example",
      context,
      climate,
      sources: sourceReferences,
      locales: ["en-IN", "hi-IN", "mr-IN"],
    };
  }
  assess(input: DemoInput): DemoAssessment {
    const at = this.now().toISOString();
    const farm: Farm = {
      id: "a5555555-5555-4555-8555-555555555555",
      schemaVersion: 1,
      context: { ...context },
      revision: 1,
      createdAt: at,
      updatedAt: at,
    };
    const weather = {
      status: "unavailable" as const,
      reason: "No current field weather is used in this sample.",
      retryable: false,
    };
    const baseline = evaluate({
      id: randomUUID(),
      farm,
      weather,
      createdAt: at,
    });
    const comparison =
      input.changes && input.changes.irrigation !== context.irrigation
        ? evaluate({
            id: randomUUID(),
            farm: {
              ...farm,
              context: {
                ...farm.context,
                irrigation: input.changes.irrigation,
              },
            },
            weather,
            createdAt: at,
            basedOnAssessmentId: baseline.id,
          })
        : null;
    return {
      demo: true,
      persisted: false,
      scenarioId: demoScenarioId,
      scenarioVersion: 1,
      baseline,
      comparison,
      climate,
    };
  }
  async budget(kind: "model" | "stt" | "tts", units: number) {
    const time = this.now().getTime();
    const limits = this.config.demoBudgets[kind];
    const windows = [60000, 86400000].map((size, i) => ({
      key: `demo-${kind}-${size}-${Math.floor(time / size)}`,
      limit: limits[i]!,
      expiresAt: new Date((Math.floor(time / size) + 2) * size).toISOString(),
    }));
    await this.store.transaction(async (tx) => {
      const records = await Promise.all(
        windows.map((w) => tx.get("quotas", w.key)),
      );
      const used = records.map((r) =>
        typeof r?.used === "number" ? r.used : 0,
      );
      if (windows.some((w, i) => used[i]! + units > w.limit))
        throw new ServiceError(
          429,
          "RATE_LIMITED",
          "The shared demo voice or AI budget is used up. Planning checks still work. Please try later.",
          true,
        );
      windows.forEach((w, i) =>
        tx.put("quotas", w.key, {
          used: used[i]! + units,
          expiresAt: w.expiresAt,
        }),
      );
    });
  }
  async explain(input: DemoExplainInput, requestSignal: AbortSignal) {
    const assessment = this.assess(input);
    const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(25000)]);
    const key = createHash("sha256")
      .update(
        JSON.stringify([
          demoScenarioId,
          1,
          RULE_VERSION,
          EXPLANATION_VERSION,
          this.config.explanationProvider,
          this.config.modelLocation,
          this.config.model,
          input.locale,
          input.question,
          input.changes?.irrigation || "one",
        ]),
      )
      .digest("hex");
    const cached = await this.store.read("demoCache", key);
    const parsed = explanationSchema.safeParse(cached?.explanation);
    let explanation =
      parsed.success &&
      parsed.data.status === "available" &&
      typeof cached?.expiresAt === "string" &&
      Date.parse(cached.expiresAt) > this.now().getTime()
        ? { ...parsed.data, model: { ...parsed.data.model, cached: true } }
        : null;
    if (!explanation) {
      if (this.config.explanationProvider === "google")
        await this.budget("model", 1);
      const generated = await this.explanation.explain(
        assessment,
        input.locale,
        input.question,
        signal,
      );
      if (generated.status === "available") {
        explanation = generated;
        await this.store.transaction(async (tx) =>
          tx.put("demoCache", key, {
            explanation: generated,
            expiresAt: new Date(this.now().getTime() + 900000).toISOString(),
          }),
        );
      } else return { ...assessment, explanation: generated, audio: silence };
    }
    let audio = silence;
    if (input.voice) {
      await this.budget("tts", explanation.summary.length);
      audio = await this.speech.synthesize(
        explanation.summary,
        input.locale,
        signal,
      );
    }
    return { ...assessment, explanation, audio };
  }
  async transcribe(
    audio: Uint8Array,
    locale: DemoLocale,
    seconds: number,
    requestSignal: AbortSignal,
  ) {
    if (this.config.explanationProvider !== "google")
      return {
        status: "unavailable",
        reason: "Google voice is not configured. Use the on-screen choices.",
        retryable: false,
      };
    const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(25000)]);
    await this.budget("stt", Math.ceil(seconds));
    let transcript: string;
    try {
      transcript = await this.speech.transcribe(audio, locale, signal);
    } catch {
      return {
        status: "unavailable",
        reason: "We could not hear that clearly. Try again or use the choices.",
        retryable: true,
      };
    }
    const interpreted = await this.interpret(transcript, locale, true, signal);
    return interpreted.status === "available"
      ? { ...interpreted, needsConfirmation: true }
      : interpreted;
  }
  async message(
    input: { text: string; locale: DemoLocale; voice: boolean },
    requestSignal: AbortSignal,
  ) {
    if (this.config.explanationProvider !== "google")
      return {
        status: "unavailable",
        reason:
          "Google message interpretation is not configured. Use the suggested actions.",
        retryable: false,
      };
    return this.interpret(
      input.text,
      input.locale,
      input.voice,
      AbortSignal.any([requestSignal, AbortSignal.timeout(25000)]),
    );
  }
  private async interpret(
    transcript: string,
    locale: DemoLocale,
    voice: boolean,
    signal: AbortSignal,
  ) {
    await this.budget("model", 1);
    let proposed;
    try {
      proposed = await this.explanation.interpret(transcript, locale, signal);
    } catch {
      return {
        status: "unavailable",
        reason:
          "We could not understand that request. Use the choices or try again.",
        retryable: true,
      };
    }
    const text = confirmation[locale][proposed.irrigation || "other"];
    const needsConfirmation = proposed.intent === "change-irrigation";
    let spoken = silence;
    if (voice && needsConfirmation) {
      await this.budget("tts", text.length);
      spoken = await this.speech.synthesize(text, locale, signal);
    }
    return {
      status: "available",
      transcript,
      proposed,
      needsConfirmation,
      locale,
      provider: "google",
      audio: spoken,
    };
  }
}
