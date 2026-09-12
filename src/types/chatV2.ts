export interface UserV2 {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'supervisor' | 'coordinator' | 'admin' | 'mentor' | 'group_leader';
  avatar_url?: string;
}

export interface MessageV2 {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  receiver_id: number;
  receiver_name: string;
  receiver_role: string;
  message_text: string;
  read_status: boolean;
  created_at: string;
}

export interface ConversationV2 {
  partner_id: number;
  partner_name: string;
  partner_role: string;
  partner_email?: string;
  partner_avatar?: string;
  last_message_id: number;
  last_message_text: string;
  last_message_time: string;
  last_sender_id: number;
  unread_count: number;
  is_online?: boolean;
}

export interface SocketMessagePayload {
  receiver_id: number;
  message_text: string;
}

export interface TypingPayload {
  receiver_id: number;
  is_typing: boolean;
}

export interface ReadReceiptPayload {
  sender_id: number;
  reader_id: number;
}

// Group chat (supervisor<->group, mentor<->group) — a separate shape from
// MessageV2/ConversationV2 above since a group message has no single
// receiver and a group conversation has no single "partner".
export interface GroupConversationV2 {
  conversation_id: number;
  type: 'supervisor' | 'mentor';
  project_group_id: number;
  group_name: string;
  level: number;
  member_count: number;
  last_message_text: string | null;
  last_message_time: string | null;
  last_sender_id: number | null;
  unread_count: number;
}

export interface GroupMessageV2 {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  group_conversation_id: number;
  message_text: string;
  created_at: string;
}

export interface GroupSocketMessagePayload {
  conversation_id: number;
  message_text: string;
}
