import { z } from "zod";
import type { DemoLocale, AudioResult } from "@kavach/contracts";
import type { SpeechProvider } from "../ports/speech.js";
import type { Config } from "../config.js";
import { GoogleCredentials } from "./google-credentials.js";

export class GoogleSpeech implements SpeechProvider {
  constructor(
    private config: Config,
    private credentials: GoogleCredentials,
  ) {}
  async transcribe(audio: Uint8Array, locale: DemoLocale, signal: AbortSignal) {
    const raw = await this.credentials.request(
      `https://${this.config.speechLocation}-speech.googleapis.com/v2/projects/${this.config.project}/locations/${this.config.speechLocation}/recognizers/_:recognize`,
      {
        config: {
          autoDecodingConfig: {},
          languageCodes: [locale],
          model: "chirp_3",
        },
        content: Buffer.from(audio).toString("base64"),
      },
      signal,
    );
    const parsed = z
      .object({
        results: z
          .array(
            z.object({
              alternatives: z.array(z.object({ transcript: z.string() })),
            }),
          )
          .optional(),
      })
      .parse(raw);
    const transcript = (parsed.results || [])
      .map((r) => r.alternatives[0]?.transcript || "")
      .join(" ")
      .trim();
    if (!transcript || transcript.length > 1200)
      throw new Error("No bounded transcript");
    return transcript;
  }
  async synthesize(
    text: string,
    locale: DemoLocale,
    signal: AbortSignal,
  ): Promise<AudioResult> {
    try {
      const voice = `${locale}-Chirp3-HD-Aoede`;
      const raw = await this.credentials.request(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        {
          input: { text },
          voice: { languageCode: locale, name: voice },
          audioConfig: { audioEncoding: "MP3" },
        },
        signal,
      );
      const { audioContent } = z
        .object({ audioContent: z.string().min(1).max(699052) })
        .parse(raw);
      if (Buffer.from(audioContent, "base64").length > 524288)
        throw new Error("Audio too large");
      return {
        status: "available",
        base64: audioContent,
        mime: "audio/mpeg",
        locale,
        voice,
      };
    } catch {
      return {
        status: "unavailable",
        reason:
          "Voice playback is unavailable. You can still read the response.",
        retryable: true,
      };
    }
  }
}
