import { request } from "./backendClient";

export async function listContributions(params = {}) {
  return await request("GET", "/api/contributions", undefined, params);
}

export async function createContribution(data) {
  return await request("POST", "/api/contributions", data);
}

export async function updateContribution(id, data) {
  return await request("PUT", `/api/contributions/${id}`, data);
}

export async function listContributionPrompts(languageCode, includeDrafts = false) {
  return await request("GET", "/api/contributions/prompts", undefined, {
    language_code: languageCode,
    include_drafts: includeDrafts,
  });
}

export async function createContributionPrompt(prompt) {
  return await request("POST", "/api/contributions/prompts", prompt);
}

export async function updateContributionPrompt(id, prompt) {
  return await request("PUT", `/api/contributions/prompts/${id}`, prompt);
}

export async function recordContributionConsent(consent) {
  return await request("POST", "/api/contributions/consent", consent);
}

export async function getContributionConsent() {
  return await request("GET", "/api/contributions/consent");
}

export async function uploadContributionRecording(file, { consentId, promptId }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("consent_id", String(consentId));
  formData.append("prompt_id", String(promptId));
  return await request("POST", "/api/contributions/recordings", formData);
}

export async function retryContributionRecording(id, file, { consentId }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("consent_id", String(consentId));
  return await request("POST", `/api/contributions/recordings/${id}/retry`, formData);
}

export async function deleteContributionRecording(id) {
  return await request("DELETE", `/api/contributions/recordings/${id}`);
}

export async function reportContributionRecording(id, reason) {
  return await request("POST", `/api/contributions/recordings/${id}/report`, { reason });
}

export async function getContributionProgress() {
  return await request("GET", "/api/contributions/progress");
}

export async function withdrawContributionConsent() {
  return await request("POST", "/api/contributions/withdraw-consent");
}
