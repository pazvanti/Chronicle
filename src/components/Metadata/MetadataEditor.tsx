import React, { useState, useEffect } from 'react';
import { useEpub } from '../../context/EpubContext';
import { Tag, Save, Plus, X, Book, User, Globe, Calendar, Shield, Hash, Layers } from 'lucide-react';
import { EpubMetadata } from '../../types/project';
import { useTranslation } from '../../i18n/I18nContext';

export const MetadataEditor: React.FC = () => {
  const { book, updateMetadata } = useEpub();
  const { t } = useTranslation();
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
        {t('statusBar.noManuscript')}
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
              {t('metadataEditor.title')}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('metadataEditor.subtitle')}
            </p>
          </div>

          <button type="submit" className="btn btn-primary">
            <Save size={15} />
            <span>{t('metadataEditor.saveBtn')}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Title */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Book size={14} />
              <span>{t('metadataEditor.bookTitle')}</span>
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
              <span>{t('metadataEditor.author')}</span>
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
              <span>{t('metadataEditor.language')}</span>
            </label>
            <select
              className="form-select"
              value={form.language}
              onChange={e => handleChange('language', e.target.value)}
            >
              <option value="en">English (en)</option>
              <option value="pt">Português (pt)</option>
              <option value="es">Español (es)</option>
              <option value="fr">Français (fr)</option>
              <option value="de">Deutsch (de)</option>
              <option value="it">Italiano (it)</option>
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
              <span>{t('metadataEditor.identifier')}</span>
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
            <label className="form-label">{t('metadataEditor.publisher')}</label>
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
              <span>{t('metadataEditor.pubdate')}</span>
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
              <span>{t('metadataEditor.rights')}</span>
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
              <span>{t('metadataEditor.series')}</span>
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
            <label className="form-label">{t('metadataEditor.seriesIndex')}</label>
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
            <label className="form-label">{t('metadataEditor.description')}</label>
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
              <span>{t('metadataEditor.subjects')}</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder={t('metadataEditor.tagPlaceholder')}
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
                <span>{t('metadataEditor.addTag')}</span>
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
