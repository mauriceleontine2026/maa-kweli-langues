import { afterEach, describe, expect, it, vi } from "vitest";

const { notifyAuthChangedMock, requestMock } = vi.hoisted(() => ({
  notifyAuthChangedMock: vi.fn(),
  requestMock: vi.fn(),
}));

vi.mock("./backendClient", () => ({
  notifyAuthChanged: notifyAuthChangedMock,
  request: requestMock,
  setInMemoryAccessToken: vi.fn(),
}));

import { verifyEmail } from "./authService";

describe("verifyEmail", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the verified user without interrupting the verification route", async () => {
    const user = { id: "user-1", email: "person@example.com", email_verified: true };
    requestMock.mockResolvedValue({ status: "ok", user });

    await expect(verifyEmail("verification-token")).resolves.toMatchObject({ user });

    expect(requestMock).toHaveBeenCalledWith("POST", "/api/auth/verify-email", {
      resetToken: "verification-token",
    });
    expect(notifyAuthChangedMock).not.toHaveBeenCalled();
  });

  it("rejects a response that does not confirm the email state", async () => {
    requestMock.mockResolvedValue({ status: "ok", user: { id: "user-1", email_verified: false } });

    await expect(verifyEmail("verification-token")).rejects.toThrow(/pas été confirmée/);
    expect(notifyAuthChangedMock).not.toHaveBeenCalled();
  });
});