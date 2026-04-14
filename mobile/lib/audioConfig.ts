import {
  IOSOutputFormat,
  AudioQuality,
  type RecordingOptions,
} from "expo-audio";

/**
 * Recording options used by the Recorder component. Extracted here so the
 * audio format configuration can evolve independently of the UI layer.
 *
 * iOS records to 16 kHz, 16-bit, mono LINEAR PCM wrapped in a WAV container —
 * exactly what Azure's Pronunciation Assessment REST endpoint expects for
 * best-quality scoring. Higher sample rates don't help because Azure's
 * acoustic models were trained at 16 kHz and downsample anything higher on
 * ingest; bumping channels or bit depth adds bytes without adding information
 * the scorer can use. The real quality levers are capturing a clean PCM
 * stream with no compression artifacts and letting the audio session fully
 * flip to record mode before the first sample is written — both handled here
 * and in Recorder.tsx's start() flow.
 */
export const RECORDING_OPTIONS: RecordingOptions = {
  extension: ".wav",
  sampleRate: 16000,
  numberOfChannels: 1,
  // Uncompressed 16-bit PCM @ 16 kHz mono = 256 kbps; higher bitRate is a
  // no-op for LINEARPCM but we state it explicitly so there's no ambiguity.
  bitRate: 256000,
  isMeteringEnabled: true,
  android: {
    // `voice_recognition` source enables platform-level echo cancellation and
    // automatic gain control tuned for speech, producing a noticeably cleaner
    // waveform than the generic `default` source.
    audioSource: "voice_recognition",
    // Android's MediaRecorder does NOT support WAV/PCM output. The `default`
    // output format produces a 3GP container which Azure rejects as invalid.
    // MPEG-4 + AAC is the highest-quality combination available and produces a
    // proper .m4a file that Azure Speech accepts directly.
    outputFormat: "mpeg4",
    audioEncoder: "aac",
  },
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    // MAX gives the highest-fidelity capture the iOS audio unit can deliver.
    // For LINEARPCM the quality flag mostly affects the internal capture
    // buffer size and AudioQueue settings — MAX reduces internal downsampling
    // jitter that can subtly affect phoneme boundaries in fast speech.
    audioQuality: AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
    bitDepthHint: 16,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};
