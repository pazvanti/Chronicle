import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Link,
  ChevronRight,
} from 'lucide-react';
import { EpubTocItem } from '../../types/epub';

export const TocManager: React.FC = () => {
  const { book, updateToc, showNotification } = useEpub();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  if (!book) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No book loaded
      </div>
    );
  }

  const handleStartRename = (item: EpubTocItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const handleSaveRename = (itemId: string) => {
    if (!editTitle.trim()) return;

    function renameInTree(items: EpubTocItem[]): EpubTocItem[] {
      return items.map(i => {
        if (i.id === itemId) {
          return { ...i, title: editTitle.trim() };
        }
        if (i.children) {
          return { ...i, children: renameInTree(i.children) };
        }
        return i;
      });
    }

    const updatedToc = renameInTree(book.toc);
    updateToc(updatedToc);
    setEditingId(null);
    showNotification('success', `Renamed TOC item to "${editTitle.trim()}"`);
  };

  const handleDeleteItem = (itemId: string) => {
    function deleteFromTree(items: EpubTocItem[]): EpubTocItem[] {
      return items
        .filter(i => i.id !== itemId)
        .map(i => ({
          ...i,
          children: i.children ? deleteFromTree(i.children) : undefined,
        }));
    }
    const updatedToc = deleteFromTree(book.toc);
    updateToc(updatedToc);
    showNotification('info', 'Deleted TOC entry');
  };

  const handleAutoGenerate = () => {
    const generated: EpubTocItem[] = book.chapters.map((ch, idx) => ({
      id: `toc-gen-${idx + 1}`,
      title: ch.title,
      href: ch.href,
      chapterId: ch.id,
      level: 1,
    }));
    updateToc(generated);
    showNotification('success', `Generated ${generated.length} TOC entries from chapters!`);
  };

  const handleAddTocItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const ch = book.chapters.find(c => c.id === selectedChapterId) || book.chapters[0];
    const newItem: EpubTocItem = {
      id: `toc-${Date.now()}`,
      title: newTitle.trim(),
      href: ch ? ch.href : 'chapter.xhtml',
      chapterId: ch?.id,
      level: 1,
    };

    updateToc([...book.toc, newItem]);
    setNewTitle('');
    showNotification('success', `Added "${newItem.title}" to Table of Contents`);
  };

  const renderTocTree = (items: EpubTocItem[]) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {items.map(item => {
          const isEditing = editingId === item.id;
          const matchingChapter = book.chapters.find(c => c.id === item.chapterId);

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                marginLeft: `${(item.level - 1) * 20}px`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                <ChevronRight size={15} color="var(--accent-primary)" />

                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                    <input
                      type="text"
                      className="form-input"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                      autoFocus
                    />
                    <button
                      className="btn-icon"
                      onClick={() => handleSaveRename(item.id)}
                      style={{ color: 'var(--accent-success)' }}
                    >
                      <Check size={16} />
                    </button>
                    <button className="btn-icon" onClick={() => setEditingId(null)}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Link size={11} />
                      <span>{matchingChapter ? matchingChapter.title : item.href}</span>
                    </div>
                  </div>
                )}
              </div>

              {!isEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    className="btn-icon btn-sm"
                    onClick={() => handleStartRename(item)}
                    title="Rename"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn-icon btn-sm"
                    onClick={() => handleDeleteItem(item.id)}
                    title="Delete"
                    style={{ color: 'var(--accent-danger)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', maxWidth: '840px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>
            Table of Contents
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Manage the reading navigation hierarchy (NCX & EPUB 3 Nav)
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleAutoGenerate}>
          <Sparkles size={14} />
          <span>Auto-Generate from Chapters</span>
        </button>
      </div>

      {/* Add Item Form */}
      <form
        onSubmit={handleAddTocItem}
        style={{
          background: 'var(--bg-surface)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          className="form-input"
          placeholder="New TOC Entry Title..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          className="form-select"
          value={selectedChapterId}
          onChange={e => setSelectedChapterId(e.target.value)}
          style={{ maxWidth: '220px' }}
        >
          {book.chapters.map(ch => (
            <option key={ch.id} value={ch.id}>
              {ch.title}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!newTitle.trim()}>
          <Plus size={15} />
          <span>Add Entry</span>
        </button>
      </form>

      {/* TOC Tree */}
      {book.toc.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
          No entries in Table of Contents. Click "Auto-Generate from Chapters" above.
        </div>
      ) : (
        renderTocTree(book.toc)
      )}
    </div>
  );
};
