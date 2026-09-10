import React from 'react';
import {
  X,
  MessageSquare,
  Trash2,
  Edit2,
  ExternalLink,
  Quote,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AuthorComment } from '../../types/epub';
import { useEpub } from '../../context/EpubContext';

interface CommentsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle?: string;
  comments: AuthorComment[];
  activeCommentId: string | null;
  onSelectComment: (comment: AuthorComment) => void;
  onDeleteComment: (commentId: string) => void;
  onJumpToHighlight: (commentId: string) => void;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  isOpen,
  onClose,
  chapterTitle,
  comments,
  activeCommentId,
  onSelectComment,
  onDeleteComment,
  onJumpToHighlight,
}) => {
  const { showCommentHighlights, toggleCommentHighlights, setShowCommentHighlights } = useEpub();

  if (!isOpen) return null;

  return (
    <aside className="comments-sidebar-drawer" aria-label="Chapter Comments">
      {/* Header */}
      <div className="comments-sidebar-header">
        <div className="comments-sidebar-title-row">
          <MessageSquare size={16} className="text-accent" />
          <h3 className="comments-sidebar-title">Comments</h3>
          <span className="badge badge-sm">{comments.length}</span>
        </div>
        <div className="comments-sidebar-header-actions">
          <button
            type="button"
            className={`btn-icon btn-sm ${!showCommentHighlights ? 'active' : ''}`}
            onClick={toggleCommentHighlights}
            title={showCommentHighlights ? 'Hide highlights in manuscript text' : 'Show highlights in manuscript text'}
            aria-label={showCommentHighlights ? 'Hide highlights in manuscript text' : 'Show highlights in manuscript text'}
            style={{
              color: !showCommentHighlights ? 'var(--accent-warning, #f59e0b)' : undefined,
            }}
          >
            {showCommentHighlights ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button
            type="button"
            className="btn-icon btn-sm"
            onClick={onClose}
            aria-label="Close comments sidebar"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {chapterTitle && (
        <div className="comments-sidebar-subhead">
          <span>Chapter: {chapterTitle}</span>
        </div>
      )}

      {/* Highlights Visibility Bar */}
      <div className="comments-visibility-bar">
        <div className="comments-visibility-status">
          <span className={`comments-visibility-dot ${showCommentHighlights ? 'active' : 'hidden'}`} />
          <span className="comments-visibility-text">
            {showCommentHighlights ? 'Text highlights visible' : 'Text highlights hidden'}
          </span>
        </div>
        <button
          type="button"
          className="comments-visibility-toggle-btn"
          onClick={toggleCommentHighlights}
          title={showCommentHighlights ? 'Hide highlights in text' : 'Show highlights in text'}
        >
          {showCommentHighlights ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* List / Empty State */}
      <div className="comments-sidebar-list">
        {comments.length === 0 ? (
          <div className="comments-empty-state">
            <div className="comments-empty-icon">
              <MessageSquare size={26} />
            </div>
            <h4>No Comments Yet</h4>
            <p>
              Select any piece of text in the editor or reader to add author feedback, revision tasks, or notes.
            </p>
          </div>
        ) : (
          comments.map(c => {
            const isActive = activeCommentId === c.id;
            return (
              <div
                key={c.id}
                className={`comment-card ${isActive ? 'active' : ''}`}
                style={{ borderLeftColor: c.color }}
                onClick={() => {
                  if (!showCommentHighlights) {
                    setShowCommentHighlights(true);
                  }
                  onJumpToHighlight(c.id);
                  onSelectComment(c);
                }}
              >
                {/* Quote Header */}
                <div className="comment-card-quote">
                  <Quote size={11} className="comment-card-quote-icon" />
                  <span className="comment-card-quote-text">
                    {c.selectedText}
                  </span>
                </div>

                {/* Comment Note */}
                <p className="comment-card-body">{c.comment}</p>

                {/* Footer / Meta & Actions */}
                <div className="comment-card-footer">
                  <div className="comment-card-date">
                    <Clock size={10} />
                    <span>
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="comment-card-actions" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn-icon btn-xs"
                      onClick={() => {
                        if (!showCommentHighlights) {
                          setShowCommentHighlights(true);
                        }
                        onJumpToHighlight(c.id);
                      }}
                      title="Jump to highlighted text"
                    >
                      <ExternalLink size={12} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-xs"
                      onClick={() => onSelectComment(c)}
                      title="Edit comment or change color"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-xs text-danger"
                      onClick={() => onDeleteComment(c.id)}
                      title="Delete comment"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
