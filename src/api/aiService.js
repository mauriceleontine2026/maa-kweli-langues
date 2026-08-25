import { request } from "./backendClient";

export async function invokeAI(prompt, responseJsonSchema = null, temperature = 0.7, provider = null, imageData = null) {
  return await request("POST", "/api/ai/chat", {
    prompt,
    response_json_schema: responseJsonSchema,
    temperature,
    provider,
    image_data: imageData,
  });
}

export async function translateText(text, sourceLanguage, targetLanguage) {
  return await request("POST", "/api/ai/translate", {
    text,
    source_language: sourceLanguage,
    target_language: targetLanguage,
  });
}
