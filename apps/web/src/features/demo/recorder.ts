export async function beginRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true },
    video: false,
  });
  let context: AudioContext;
  try {
    context = new AudioContext();
    await context.audioWorklet.addModule("/recorder-worklet.js");
    await context.resume();
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    throw error;
  }
  const source = context.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(context, "kavach-recorder");
  const mute = context.createGain();
  mute.gain.value = 0;
  const parts: Float32Array[] = [];
  let count = 0;
  let stopped = false;
  worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
    if (!stopped && count < context.sampleRate * 30) {
      parts.push(event.data);
      count += event.data.length;
    }
  };
  source.connect(worklet);
  worklet.connect(mute);
  mute.connect(context.destination);
  return {
    stop: async () => {
      if (stopped) return null;
      stopped = true;
      stream.getTracks().forEach((t) => t.stop());
      source.disconnect();
      worklet.disconnect();
      mute.disconnect();
      await context.close();
      const samples = new Float32Array(count);
      let at = 0;
      for (const part of parts) {
        samples.set(part, at);
        at += part.length;
      }
      const length = Math.min(
        480000,
        Math.floor((count * 16000) / context.sampleRate),
      );
      if (length < 1600) return null;
      const buffer = new ArrayBuffer(44 + length * 2);
      const view = new DataView(buffer);
      const write = (offset: number, text: string) => {
        for (let i = 0; i < text.length; i++)
          view.setUint8(offset + i, text.charCodeAt(i));
      };
      write(0, "RIFF");
      view.setUint32(4, 36 + length * 2, true);
      write(8, "WAVE");
      write(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, 16000, true);
      view.setUint32(28, 32000, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      write(36, "data");
      view.setUint32(40, length * 2, true);
      const ratio = context.sampleRate / 16000;
      for (let i = 0; i < length; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.min(count, Math.floor((i + 1) * ratio));
        let sum = 0;
        for (let j = start; j < end; j++) sum += samples[j]!;
        const sample = Math.max(
          -1,
          Math.min(1, sum / Math.max(1, end - start)),
        );
        view.setInt16(
          44 + i * 2,
          sample < 0 ? sample * 32768 : sample * 32767,
          true,
        );
      }
      return new Blob([buffer], { type: "audio/wav" });
    },
  };
}
