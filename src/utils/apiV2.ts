import { ConversationV2, MessageV2, UserV2 } from "../types/chatV2";

const API_BASE = "http://localhost:5000/api/v2/messages";

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token") || localStorage.getItem("jwt");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Fetches all active conversations for the current user in a single optimized SQL query.
 * Eliminates N+1 frontend requests entirely.
 */
export const fetchConversationsV2 = async (userId: number): Promise<ConversationV2[]> => {
  try {
    const response = await fetch(`${API_BASE}/conversations?user_id=${userId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to load conversations: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error("[ChatV2 API] Error fetching conversations:", error);
    return [];
  }
};

/**
 * Fetches paginated message history between current user and partner with normalized JOINs.
 */
export const fetchMessageHistoryV2 = async (
  userId: number,
  partnerId: number,
  limit: number = 50,
  offset: number = 0
): Promise<MessageV2[]> => {
  try {
    const params = new URLSearchParams({
      user_id: userId.toString(),
      partner_id: partnerId.toString(),
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${API_BASE}?${params}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to load message history: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error("[ChatV2 API] Error fetching messages:", error);
    return [];
  }
};

/**
 * REST Fallback to send a message (if socket is temporarily disconnected).
 */
export const sendMessageV2 = async (
  senderId: number,
  receiverId: number,
  messageText: string
): Promise<MessageV2 | null> => {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sender_id: senderId,
        receiver_id: receiverId,
        message_text: messageText,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[ChatV2 API] Error sending message:", error);
    return null;
  }
};

/**
 * Marks messages from a sender to the current user as read.
 */
export const markMessagesAsReadV2 = async (
  senderId: number,
  receiverId: number
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/read`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sender_id: senderId,
        receiver_id: receiverId,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("[ChatV2 API] Error marking messages read:", error);
    return false;
  }
};

/**
 * Fetches available users/recipients by role for starting new conversations.
 * Uses V2 endpoint which properly handles lecturer designations (supervisor vs coordinator).
 */
export const fetchRecipientsV2 = async (role?: string, currentUserId?: number): Promise<UserV2[]> => {
  try {
    const params = new URLSearchParams();
    if (role) params.append("role", role);
    if (currentUserId) params.append("user_id", currentUserId.toString());

    const response = await fetch(`${API_BASE}/recipients?${params.toString()}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      // Fallback to legacy endpoint if V2 not yet running
      const legacyUrl = role === "group_leader"
        ? "http://localhost:5000/api/messages/leaders"
        : `http://localhost:5000/api/users?role=${role === "supervisor" || role === "coordinator" ? "lecturer" : role}`;
      
      const legacyRes = await fetch(legacyUrl, { headers: getAuthHeaders() });
      if (legacyRes.ok) {
        const legacyData = await legacyRes.json();
        return Array.isArray(legacyData) ? legacyData : legacyData.data || [];
      }
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  } catch (error) {
    console.error("[ChatV2 API] Error fetching recipients:", error);
    return [];
  }
};
