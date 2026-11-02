import { request } from "./backendClient";

export async function getAIConversations() {
  return request("GET", "/api/ai-conversations");
}

export async function saveAIConversation(conversation) {
  const conversationId = encodeURIComponent(conversation.id);
  return request("PUT", `/api/ai-conversations/${conversationId}`, {
    title: conversation.title,
    language_code: conversation.language,
    messages: conversation.messages,
    updated_at: new Date(conversation.updatedAt).toISOString(),
  });
}

export async function deleteAIConversation(conversationId) {
  return request("DELETE", `/api/ai-conversations/${encodeURIComponent(conversationId)}`);
}
