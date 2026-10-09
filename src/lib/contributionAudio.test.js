import { describe, expect, it } from "vitest";
import { getContributionAudioExtension } from "./contributionAudio";

describe("getContributionAudioExtension", () => {
  it.each([
    ["audio/webm;codecs=opus", "webm"],
    ["audio/ogg;codecs=opus", "ogg"],
    ["audio/mp4;codecs=mp4a.40.2", "m4a"],
    ["audio/aac", "aac"],
  ])("maps %s to the supported file extension", (mimeType, extension) => {
    expect(getContributionAudioExtension(mimeType)).toBe(extension);
  });

  it("rejects MIME types unsupported by the upload API", () => {
    expect(getContributionAudioExtension("audio/3gpp")).toBeNull();
    expect(getContributionAudioExtension("")).toBeNull();
  });
});