const MIME_EXTENSIONS = {
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
};

export function getContributionAudioExtension(mimeType) {
  const baseMimeType = String(mimeType || "").split(";")[0].trim().toLowerCase();
  return MIME_EXTENSIONS[baseMimeType] || null;
}