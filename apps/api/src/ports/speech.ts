import type { AudioResult, DemoLocale } from "@kavach/contracts";
export interface SpeechProvider {
  transcribe(
    audio: Uint8Array,
    locale: DemoLocale,
    signal: AbortSignal,
  ): Promise<string>;
  synthesize(
    text: string,
    locale: DemoLocale,
    signal: AbortSignal,
  ): Promise<AudioResult>;
}
export class DisabledSpeech implements SpeechProvider {
  async transcribe(): Promise<string> {
    throw new Error("Speech is disabled");
  }
  async synthesize(): Promise<AudioResult> {
    return {
      status: "unavailable",
      reason: "Voice playback is not configured.",
      retryable: false,
    };
  }
}
