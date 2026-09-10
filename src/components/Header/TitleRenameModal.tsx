import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import { X, Check, BookMarked, User } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface TitleRenameModalProps {
  onClose: () => void;
}

export const TitleRenameModal: React.FC<TitleRenameModalProps> = ({ onClose }) => {
  const { book, updateMetadata } = useEpub();
  const [title, setTitle] = useState(book?.metadata.title || '');
  const [author, setAuthor] = useState(book?.metadata.creator || '');

  useEscapeKey(onClose);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      updateMetadata({
        title: title.trim(),
        creator: author.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '460px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookMarked size={18} color="var(--accent-primary)" />
            <h3 className="modal-title">Rename Manuscript</h3>
          </div>
          <button className="btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <BookMarked size={13} />
              <span>Book Title:</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. The Great Adventure"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={13} />
              <span>Author / Creator:</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="e.g. Arthur Conan Doyle"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              <Check size={14} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
