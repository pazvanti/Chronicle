import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Edit2,
  Check,
  MessageSquare,
  Clock,
  Quote,
  Palette,
} from 'lucide-react';
import { AuthorComment } from '../../types/epub';
import {
  COMMENT_HIGHLIGHT_COLORS,
  DEFAULT_HIGHLIGHT_COLOR,
} from '../../services/epub/commentHighlightService';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If editing an existing comment:
  comment?: AuthorComment | null;
  // If creating a new comment:
  selectedText?: string;
  onSaveNew?: (text: string, note: string, color: string) => void;
  onUpdate?: (commentId: string, updates: { comment?: string; color?: string }) => void;
  onDelete?: (commentId: string) => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  comment,
  selectedText = '',
  onSaveNew,
  onUpdate,
  onDelete,
}) => {
  const isEditingExisting = Boolean(comment);

  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_HIGHLIGHT_COLOR);
  const [isEditingNote, setIsEditingNote] = useState(!isEditingExisting);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEscapeKey(() => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
    } else {
      onClose();
    }
  }, isOpen);

  // Sync state whenever modal opens or comment changes
  useEffect(() => {
    if (isOpen) {
      if (comment) {
        setNoteText(comment.comment);
        setSelectedColor(comment.color);
        setIsEditingNote(false);
      } else {
        setNoteText('');
        setSelectedColor(DEFAULT_HIGHLIGHT_COLOR);
        setIsEditingNote(true);
      }
      setShowDeleteConfirm(false);
    }
  }, [isOpen, comment]);

  // Focus textarea when editing
  useEffect(() => {
    if (isOpen && isEditingNote && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, isEditingNote]);

  if (!isOpen) return null;

  const quoteSnippet = (comment ? comment.selectedText : selectedText).trim();

  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    if (comment && onUpdate) {
      onUpdate(comment.id, { color: newColor });
    }
  };

  const handleSave = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;

    if (isEditingExisting && comment && onUpdate) {
      onUpdate(comment.id, { comment: trimmed, color: selectedColor });
      setIsEditingNote(false);
    } else if (onSaveNew && quoteSnippet) {
      onSaveNew(quoteSnippet, trimmed, selectedColor);
      onClose();
    }
  };

  const handleDelete = () => {
    if (comment && onDelete) {
      onDelete(comment.id);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="comment-modal-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="comment-modal-header">
          <div className="comment-modal-title-row">
            <div
              className="comment-color-indicator"
              style={{ backgroundColor: selectedColor }}
            />
            <h3 className="comment-modal-title">
              {isEditingExisting ? 'Author Note' : 'Add Comment & Highlight'}
            </h3>
          </div>
          <button
            type="button"
            className="btn-icon btn-sm"
            onClick={onClose}
            aria-label="Close comment dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="comment-modal-body">
          {/* Quoted Text Preview */}
          {quoteSnippet && (
            <div
              className="comment-quote-card"
              style={{ borderLeftColor: selectedColor }}
            >
              <div className="comment-quote-label">
                <Quote size={12} />
                <span>Selected Passage</span>
              </div>
              <p className="comment-quote-text">"{quoteSnippet}"</p>
            </div>
          )}

          {/* Color Palette Selector */}
          <div className="comment-section">
            <div className="comment-section-label">
              <Palette size={13} />
              <span>Highlight Color</span>
            </div>
            <div className="comment-color-palette">
              {COMMENT_HIGHLIGHT_COLORS.map(c => {
                const isSelected = selectedColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`comment-color-swatch ${isSelected ? 'active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => handleColorChange(c.hex)}
                    title={`${c.name}${isSelected ? ' (Selected)' : ''}`}
                    aria-label={c.name}
                  >
                    {isSelected && <Check size={13} color="#0f172a" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment Note Content */}
          <div className="comment-section">
            <div className="comment-section-label">
              <MessageSquare size={13} />
              <span>Comment Note</span>
            </div>

            {isEditingNote ? (
              <textarea
                ref={textareaRef}
                className="comment-textarea"
                rows={4}
                placeholder="Write your observation, revision task, or editorial note..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            ) : (
              <div className="comment-note-display">
                <p className="comment-note-content">{comment?.comment}</p>
                {comment?.createdAt && (
                  <div className="comment-note-meta">
                    <Clock size={12} />
                    <span>
                      {new Date(comment.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="comment-modal-footer">
          {showDeleteConfirm ? (
            <div className="comment-delete-confirm-row">
              <span className="text-danger text-sm">Remove this highlight and note?</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handleDelete}
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {isEditingExisting ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost text-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    title="Delete this comment and remove highlight"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isEditingNote ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setNoteText(comment?.comment || '');
                            setIsEditingNote(false);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={handleSave}
                          disabled={!noteText.trim()}
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={onClose}
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => setIsEditingNote(true)}
                        >
                          <Edit2 size={13} />
                          <span>Edit Note</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleSave}
                    disabled={!noteText.trim()}
                  >
                    Add Comment
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
