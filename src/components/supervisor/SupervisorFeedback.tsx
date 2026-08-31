import React, { useState } from "react";
import { MessageSquarePlus, Send, X, Loader, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { sendMessageV2 } from "../../utils/apiV2";
import { fetchMyGroupConversationsV2, sendGroupMessageV2Rest } from "../../utils/groupChatApiV2";
import "./SupervisorFeedback.css";

// Self-contained "give feedback" control: a small button that opens a
// compact box where a supervisor types feedback, then sends it through the
// existing chat feature — no new backend, no changes to apiV2.ts,
// groupChatApiV2.ts, or any chat component; this only imports and calls
// what they already export.
//
//   kind="milestone" -> sent once to the group's supervisor chat
//   kind="task"       -> sent 1:1 to the task's assigned student

type SupervisorFeedbackProps =
  | {
      kind: "milestone";
      groupId: number;
      milestoneTitle: string;
    }
  | {
      kind: "task";
      studentId: number | string;
      studentName: string;
      taskName: string;
      milestoneTitle: string;
    };

const buildFeedbackMessage = (props: SupervisorFeedbackProps, feedbackText: string): string => {
  if (props.kind === "milestone") {
    return `📋 [Supervisor Milestone Feedback]\n🎯 Milestone: ${props.milestoneTitle}\n💬 Feedback: ${feedbackText}`;
  }
  return `📝 [Supervisor Task Feedback]\n📌 Task: ${props.taskName}\n🎯 Milestone: ${props.milestoneTitle}\n💬 Feedback: ${feedbackText}`;
};

const SupervisorFeedback: React.FC<SupervisorFeedbackProps> = (props) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const openBox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
    setError("");
    setSent(false);
  };

  const closeBox = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsOpen(false);
    setText("");
    setError("");
    setSent(false);
  };

  const handleSend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text.trim() || !user || sending) return;

    setSending(true);
    setError("");

    try {
      const message = buildFeedbackMessage(props, text.trim());
      let ok = false;

      if (props.kind === "milestone") {
        const conversations = await fetchMyGroupConversationsV2(Number(user.id));
        const target = conversations.find(
          (c) => c.project_group_id === props.groupId && c.type === "supervisor",
        );
        if (!target) {
          setError("This group's chat isn't available yet.");
          setSending(false);
          return;
        }
        ok = Boolean(await sendGroupMessageV2Rest(target.conversation_id, Number(user.id), message));
      } else {
        ok = Boolean(await sendMessageV2(Number(user.id), Number(props.studentId), message));
      }

      if (!ok) {
        setError("Failed to send feedback. Please try again.");
        setSending(false);
        return;
      }

      setSent(true);
      setText("");
      setTimeout(() => setIsOpen(false), 1200);
    } catch (err) {
      console.error("[SupervisorFeedback] Failed to send feedback:", err);
      setError("Failed to send feedback. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="supervisor-feedback-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="supervisor-feedback-trigger"
        onClick={openBox}
        title={props.kind === "milestone" ? "Give feedback on this milestone" : "Give feedback on this task"}
      >
        <MessageSquarePlus size={13} />
        Feedback
      </button>

      {isOpen && (
        <div className="supervisor-feedback-box">
          <div className="supervisor-feedback-box-header">
            <span>
              {props.kind === "milestone" ? `Feedback: ${props.milestoneTitle}` : `Feedback for ${props.studentName}`}
            </span>
            <button type="button" className="supervisor-feedback-close" onClick={closeBox} title="Close">
              <X size={14} />
            </button>
          </div>

          {props.kind === "task" && (
            <p className="supervisor-feedback-context">
              Task: {props.taskName} · Milestone: {props.milestoneTitle}
            </p>
          )}

          <textarea
            className="supervisor-feedback-textarea"
            placeholder="Type feedback..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            disabled={sending || sent}
            rows={3}
          />

          {error && <p className="supervisor-feedback-error">{error}</p>}
          {sent && (
            <p className="supervisor-feedback-sent">
              <Check size={13} /> Feedback sent
            </p>
          )}

          <div className="supervisor-feedback-actions">
            <button type="button" className="supervisor-feedback-cancel" onClick={closeBox} disabled={sending}>
              Cancel
            </button>
            <button
              type="button"
              className="supervisor-feedback-send"
              onClick={handleSend}
              disabled={sending || sent || !text.trim()}
            >
              {sending ? <Loader size={14} className="supervisor-feedback-spin" /> : <Send size={14} />}
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorFeedback;
