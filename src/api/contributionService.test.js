import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./backendClient";
import {
  deleteContributionRecording,
  getContributionConsent,
  getContributionProgress,
  listContributionPrompts,
  recordContributionConsent,
  reportContributionRecording,
  retryContributionRecording,
  uploadContributionRecording,
  withdrawContributionConsent,
} from "./contributionService";

vi.mock("./backendClient", () => ({ request: vi.fn() }));

describe("contribution service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests only prompts for the selected language", async () => {
    await listContributionPrompts("bam");

    expect(request).toHaveBeenCalledWith("GET", "/api/contributions/prompts", undefined, {
      language_code: "bam",
      include_drafts: false,
    });
  });

  it("records consent before submitting an audio blob", async () => {
    const consent = { collection_review: true, tts_internal: false, public_dataset: false };
    const audio = new File(["audio"], "voice.webm", { type: "audio/webm" });

    await recordContributionConsent(consent);
    await uploadContributionRecording(audio, { consentId: 7, promptId: 12 });

    expect(request).toHaveBeenNthCalledWith(1, "POST", "/api/contributions/consent", consent);
    const [method, path, formData] = request.mock.calls[1];
    expect([method, path]).toEqual(["POST", "/api/contributions/recordings"]);
    expect(formData.get("file").name).toBe("voice.webm");
    expect(formData.get("consent_id")).toBe("7");
    expect(formData.get("prompt_id")).toBe("12");
  });

  it("loads authenticated contribution progress", async () => {
    await getContributionProgress();

    expect(request).toHaveBeenCalledWith("GET", "/api/contributions/progress");
  });

  it("loads and withdraws the contributor's active voice consent", async () => {
    await getContributionConsent();
    await withdrawContributionConsent();

    expect(request).toHaveBeenNthCalledWith(1, "GET", "/api/contributions/consent");
    expect(request).toHaveBeenNthCalledWith(2, "POST", "/api/contributions/withdraw-consent");
  });

  it("uses the existing recording id for retry, report, and delete", async () => {
    const audio = new File(["replacement"], "retry.webm", { type: "audio/webm" });
    await retryContributionRecording(19, audio, { consentId: 8 });
    await reportContributionRecording(19, "Transcription incorrecte");
    await deleteContributionRecording(19);

    expect(request.mock.calls[0][0]).toBe("POST");
    expect(request.mock.calls[0][1]).toBe("/api/contributions/recordings/19/retry");
    expect(request.mock.calls[0][2].get("consent_id")).toBe("8");
    expect(request).toHaveBeenNthCalledWith(2, "POST", "/api/contributions/recordings/19/report", { reason: "Transcription incorrecte" });
    expect(request).toHaveBeenNthCalledWith(3, "DELETE", "/api/contributions/recordings/19");
  });
});