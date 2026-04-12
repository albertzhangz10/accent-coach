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
 * best-quality scoring.
 */
export const RECORDING_OPTIONS: RecordingOptions = {
  extension: ".wav",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  isMeteringEnabled: true,
  android: {
    outputFormat: "default",
    audioEncoder: "default",
  },
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};
