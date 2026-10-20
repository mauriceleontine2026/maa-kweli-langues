const AUDIO_RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

export const getSupportedAudioRecordingMimeType = (mediaRecorder) => {
  if (typeof mediaRecorder?.isTypeSupported !== "function") return "";
  return AUDIO_RECORDING_MIME_TYPES.find((mimeType) => mediaRecorder.isTypeSupported(mimeType)) || "";
};