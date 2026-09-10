import React from 'react';
import { MessageSquarePlus } from 'lucide-react';

interface CommentFloatingPillProps {
  position: { x: number; y: number } | null;
  onAddComment: () => void;
}

export const CommentFloatingPill: React.FC<CommentFloatingPillProps> = ({
  position,
  onAddComment,
}) => {
  if (!position) return null;

  return (
    <div
      className="comment-floating-pill"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-8px)',
        zIndex: 1000,
      }}
      onMouseDown={e => {
        // Prevent clearing selection when clicking pill
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        className="comment-floating-btn"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onAddComment();
        }}
        title="Add author comment & highlight text"
      >
        <MessageSquarePlus size={14} />
        <span>Add Comment</span>
      </button>
    </div>
  );
};
