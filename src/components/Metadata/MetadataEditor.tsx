import React, { useState, useEffect } from 'react';
import { useEpub } from '../../context/EpubContext';
import { Tag, Save, Plus, X, Book, User, Globe, Calendar, Shield, Hash, Layers } from 'lucide-react';
import { EpubMetadata } from '../../types/epub';

export const MetadataEditor: React.FC = () => {
  const { book, updateMetadata } = useEpub();
  const [form, setForm] = useState<EpubMetadata>({
    title: '',
    creator: '',
    language: 'en',
    identifier: '',
    publisher: '',
    pubdate: '',
    rights: '',
    description: '',
    subjects: [],
    series: '',
    seriesIndex: '',
  });
  const [newTag, setNewTag] = useState<string>('');

  useEffect(() => {
    if (book) {
      setForm(book.metadata);
    }
  }, [book]);

  if (!book) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No book loaded
      </div>
    );
  }

  const handleChange = (field: keyof EpubMetadata, value: any) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      updateMetadata(next, true);
      return next;
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !form.subjects.includes(newTag.trim())) {
      const updated = [...form.subjects, newTag.trim()];
      handleChange('subjects', updated);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = form.subjects.filter(t => t !== tagToRemove);
    handleChange('subjects', updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMetadata(form);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', maxWidth: '840px', margin: '0 auto', width: '100%' }}>
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>
              Book Metadata & Information
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Standard Dublin Core and EPUB 3 metadata embedded into the package OPF
            </p>
          </div>

          <button type="submit" className="btn btn-primary">
            <Save size={15} />
            <span>Save Metadata</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Title */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Book size={14} />
              <span>Book Title</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="e.g. Alice's Adventures in Wonderland"
              required
            />
          </div>

          {/* Creator / Author */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={14} />
              <span>Author / Creator</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={form.creator}
              onChange={e => handleChange('creator', e.target.value)}
              placeholder="e.g. Lewis Carroll"
            />
          </div>

          {/* Language */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Globe size={14} />
              <span>Language Code</span>
            </label>
            <select
              className="form-select"
              value={form.language}
              onChange={e => handleChange('language', e.target.value)}
            >
              <option value="en">English (en)</option>
              <option value="es">Spanish (es)</option>
              <option value="fr">French (fr)</option>
              <option value="de">German (de)</option>
              <option value="it">Italian (it)</option>
              <option value="pt">Portuguese (pt)</option>
              <option value="zh">Chinese (zh)</option>
              <option value="ja">Japanese (ja)</option>
              <option value="ru">Russian (ru)</option>
              <option value="ar">Arabic (ar)</option>
            </select>
          </div>

          {/* Identifier / ISBN */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Hash size={14} />
              <span>Identifier / ISBN / UUID</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={form.identifier}
              onChange={e => handleChange('identifier', e.target.value)}
              placeholder="urn:uuid:... or ISBN"
            />
          </div>

          {/* Publisher */}
          <div className="form-group">
            <label className="form-label">Publisher</label>
            <input
              type="text"
              className="form-input"
              value={form.publisher}
              onChange={e => handleChange('publisher', e.target.value)}
              placeholder="e.g. Macmillan / Antigravity"
            />
          </div>

          {/* Publication Date */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={14} />
              <span>Publication Date</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={form.pubdate ? form.pubdate.substring(0, 10) : ''}
              onChange={e => handleChange('pubdate', e.target.value)}
            />
          </div>

          {/* Rights */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={14} />
              <span>Rights / License</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={form.rights}
              onChange={e => handleChange('rights', e.target.value)}
              placeholder="e.g. Public Domain or All Rights Reserved"
            />
          </div>

          {/* Series */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={14} />
              <span>Series Name (Optional)</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={form.series || ''}
              onChange={e => handleChange('series', e.target.value)}
              placeholder="e.g. Wonderland Series"
            />
          </div>

          {/* Series Index */}
          <div className="form-group">
            <label className="form-label">Series Index / Volume</label>
            <input
              type="text"
              className="form-input"
              value={form.seriesIndex || ''}
              onChange={e => handleChange('seriesIndex', e.target.value)}
              placeholder="e.g. 1"
            />
          </div>

          {/* Description */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Description / Synopsis</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Summary of the book..."
            />
          </div>

          {/* Subject Tags */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Tag size={14} />
              <span>Subject Tags & Categories</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Add a genre or subject tag..."
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={handleAddTag}>
                <Plus size={15} />
                <span>Add Tag</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {form.subjects.map(tag => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.65rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
