export function encodeWav(
  samples: Int16Array,
  sampleRate: number,
  channels: number,
): ArrayBuffer {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCM samples
  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset + i * 2, samples[i], true);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export class WavRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private recording = false;
  private startTime = 0;
  private peakLevel = 0;
  private nativeSampleRate = 48000;

  async start(): Promise<void> {
    this.chunks = [];
    this.peakLevel = 0;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
        sampleRate: { ideal: 48000 },
      },
    });

    this.audioContext = new AudioContext();
    this.nativeSampleRate = this.audioContext.sampleRate;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.recording) return;
      const input = e.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      this.chunks.push(copy);

      for (let i = 0; i < input.length; i++) {
        const abs = Math.abs(input[i]);
        if (abs > this.peakLevel) this.peakLevel = abs;
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.recording = true;
    this.startTime = Date.now();
  }

  stop(): Blob {
    this.recording = false;
    this.cleanup();

    // Merge chunks
    const totalLength = this.chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Downsample to 16kHz using nearest-neighbor
    const targetRate = 16000;
    const ratio = this.nativeSampleRate / targetRate;
    const outputLength = Math.floor(merged.length / ratio);
    const int16 = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIdx = Math.round(i * ratio);
      const sample = Math.max(-1, Math.min(1, merged[srcIdx] ?? 0));
      int16[i] = sample * 0x7fff;
    }

    const wavBuffer = encodeWav(int16, targetRate, 1);
    this.chunks = [];
    return new Blob([wavBuffer], { type: "audio/wav" });
  }

  cancel(): void {
    this.recording = false;
    this.cleanup();
    this.chunks = [];
  }

  getDurationMs(): number {
    if (!this.recording) return 0;
    return Date.now() - this.startTime;
  }

  getPeakLevel(): number {
    return this.peakLevel;
  }

  isRecording(): boolean {
    return this.recording;
  }

  private cleanup(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
