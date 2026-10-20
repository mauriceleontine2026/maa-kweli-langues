import { describe, expect, it } from "vitest";
import { getSupportedAudioRecordingMimeType } from "./audioRecording";

describe("getSupportedAudioRecordingMimeType", () => {
  it("selects WebM when the browser supports it", () => {
    const mediaRecorder = { isTypeSupported: (mimeType) => mimeType === "audio/webm;codecs=opus" };

    expect(getSupportedAudioRecordingMimeType(mediaRecorder)).toBe("audio/webm;codecs=opus");
  });

  it("falls back to MP4 for Safari-compatible recording", () => {
    const mediaRecorder = { isTypeSupported: (mimeType) => mimeType === "audio/mp4;codecs=mp4a.40.2" };

    expect(getSupportedAudioRecordingMimeType(mediaRecorder)).toBe("audio/mp4;codecs=mp4a.40.2");
  });

  it("returns an empty type when no preferred type is supported", () => {
    const mediaRecorder = { isTypeSupported: () => false };

    expect(getSupportedAudioRecordingMimeType(mediaRecorder)).toBe("");
  });
});