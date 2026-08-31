import { GroupConversationV2, GroupMessageV2 } from "../types/chatV2";

const API_BASE = "http://localhost:5000/api/v2/group-conversations";

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
 * Fetches every group conversation (supervisor<->group, mentor<->group) the
 * current user belongs to. The backend auto-provisions/syncs these from
 * project_groups + project_group_members on every call, so a newly assigned
 * supervisor/mentor's group chat just appears next time this is called —
 * no separate "create group chat" step needed on the frontend.
 */
export const fetchMyGroupConversationsV2 = async (userId: number): Promise<GroupConversationV2[]> => {
  try {
    const response = await fetch(`${API_BASE}/mine?user_id=${userId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to load group conversations: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error("[GroupChatV2 API] Error fetching group conversations:", error);
    return [];
  }
};

export const fetchGroupMessagesV2 = async (
  conversationId: number,
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<GroupMessageV2[]> => {
  try {
    const params = new URLSearchParams({
      user_id: userId.toString(),
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${API_BASE}/${conversationId}/messages?${params}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to load group messages: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error("[GroupChatV2 API] Error fetching group messages:", error);
    return [];
  }
};

/**
 * REST fallback to send a group message (if the socket is temporarily
 * disconnected) — same role as sendMessageV2 for 1:1 chat.
 */
export const sendGroupMessageV2Rest = async (
  conversationId: number,
  senderId: number,
  messageText: string
): Promise<GroupMessageV2 | null> => {
  try {
    const response = await fetch(`${API_BASE}/${conversationId}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sender_id: senderId,
        message_text: messageText,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send group message: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[GroupChatV2 API] Error sending group message:", error);
    return null;
  }
};

export const markGroupConversationReadV2 = async (
  conversationId: number,
  userId: number
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/${conversationId}/read`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId }),
    });
    return response.ok;
  } catch (error) {
    console.error("[GroupChatV2 API] Error marking group conversation read:", error);
    return false;
  }
};
