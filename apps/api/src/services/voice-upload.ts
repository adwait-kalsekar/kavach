import { ServiceError } from "../errors.js";
export async function readVoice(request: Request) {
  if (!/^audio\/wav(?:\s*;|$)/i.test(request.headers.get("content-type") || ""))
    throw new ServiceError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Send PCM16 mono 16 kHz audio/wav.",
    );
  if (Number(request.headers.get("content-length")) > 1048576)
    throw new ServiceError(413, "PAYLOAD_TOO_LARGE", "Audio exceeds 1 MiB.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new ServiceError(400, "VALIDATION_ERROR", "Audio is required.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, 10000);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 1048576) {
        await reader.cancel();
        throw new ServiceError(
          413,
          "PAYLOAD_TOO_LARGE",
          "Audio exceeds 1 MiB.",
        );
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "The recording could not be uploaded completely.",
    );
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  if (timedOut)
    throw new ServiceError(400, "VALIDATION_ERROR", "Audio upload timed out.");
  const audio = Buffer.concat(chunks);
  const invalid = () =>
    new ServiceError(
      400,
      "VALIDATION_ERROR",
      "Use a complete PCM16 mono 16 kHz WAV recording, at most 30 seconds.",
    );
  if (
    audio.length < 44 ||
    audio.toString("ascii", 0, 4) !== "RIFF" ||
    audio.toString("ascii", 8, 12) !== "WAVE" ||
    audio.readUInt32LE(4) + 8 !== audio.length
  )
    throw invalid();
  let format = false;
  let bytes = 0;
  let offset = 12;
  for (; offset + 8 <= audio.length;) {
    const size = audio.readUInt32LE(offset + 4);
    const end = offset + 8 + size;
    if (end > audio.length) throw invalid();
    const id = audio.toString("ascii", offset, offset + 4);
    if (id === "fmt ") {
      if (
        format ||
        size < 16 ||
        audio.readUInt16LE(offset + 8) !== 1 ||
        audio.readUInt16LE(offset + 10) !== 1 ||
        audio.readUInt32LE(offset + 12) !== 16000 ||
        audio.readUInt32LE(offset + 16) !== 32000 ||
        audio.readUInt16LE(offset + 20) !== 2 ||
        audio.readUInt16LE(offset + 22) !== 16
      )
        throw invalid();
      format = true;
    }
    if (id === "data") {
      if (bytes) throw invalid();
      bytes = size;
    }
    offset = end + (size % 2);
  }
  if (
    offset !== audio.length ||
    !format ||
    bytes < 3200 ||
    bytes % 2 ||
    bytes > 960000
  )
    throw invalid();
  return { audio, seconds: bytes / 32000 };
}
