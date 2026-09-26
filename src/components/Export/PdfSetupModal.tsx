import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  X,
  FileType,
  Download,
  Loader2,
  BookOpen,
  Settings,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  List,
  Printer,
} from 'lucide-react';
import { exportToPdfDirect, openPrintPdfView } from '../../services/epub/multiExport';
import { PdfBookOptions } from '../../services/epub/pdfBookTypesetter';
import { getStoredSettings, updateStoredSettings } from '../../services/epub/settingsStorage';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface PdfSetupModalProps {
  onClose: () => void;
}

export const PdfSetupModal: React.FC<PdfSetupModalProps> = ({ onClose }) => {
  const { book, showNotification } = useEpub();
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEscapeKey(onClose);

  // Load persistent user preferences
  const saved = getStoredSettings();
  const [includeCover, setIncludeCover] = useState<boolean>(
    saved.pdfIncludeCover !== undefined ? saved.pdfIncludeCover : true
  );
  const [includeChapterTitles, setIncludeChapterTitles] = useState<boolean>(
    saved.pdfIncludeChapterTitles !== undefined ? saved.pdfIncludeChapterTitles : true
  );
  const [includeOrnament, setIncludeOrnament] = useState<boolean>(
    saved.pdfIncludeOrnament !== undefined ? saved.pdfIncludeOrnament : true
  );
  const [includePubDate, setIncludePubDate] = useState<boolean>(
    saved.pdfIncludePubDate !== undefined ? saved.pdfIncludePubDate : true
  );
  const [tocPosition, setTocPosition] = useState<'none' | 'start' | 'end'>(
    saved.pdfTocPosition || 'none'
  );
  const [trimSize, setTrimSize] = useState<'6x9' | '5.5x8.5' | 'a4' | 'letter'>(
    saved.pdfTrimSize || '6x9'
  );
  const [fontFamily, setFontFamily] = useState<'times' | 'helvetica'>(
    saved.pdfFontFamily || 'times'
  );

  if (!book) return null;

  const buildOptions = (): PdfBookOptions => ({
    includeCover,
    includeChapterTitles,
    includeOrnament,
    includePubDate,
    tocPosition,
    trimSize,
    fontFamily,
  });

  const saveSettings = () => {
    updateStoredSettings({
      pdfIncludeCover: includeCover,
      pdfIncludeChapterTitles: includeChapterTitles,
      pdfIncludeOrnament: includeOrnament,
      pdfIncludePubDate: includePubDate,
      pdfTocPosition: tocPosition,
      pdfTrimSize: trimSize,
      pdfFontFamily: fontFamily,
    });
  };

  const handleExportPdf = async () => {
    try {
      setIsGenerating(true);
      showNotification('info', 'Typesetting publication-grade vector text PDF...');
      saveSettings();

      const options = buildOptions();
      await exportToPdfDirect(book, options);
      showNotification('success', `Exported "${book.metadata.title}.pdf" successfully!`);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error';
      showNotification('error', `Failed to generate PDF: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintPreview = () => {
    saveSettings();
    const options = buildOptions();
    openPrintPdfView(book, options);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileType size={20} />
            </div>
            <div>
              <h2 className="modal-title">Print-Ready Vector PDF Settings</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Configure publication layout, front matter, and book typography
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ gap: '1.25rem', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Section 1: Front Matter & Title Page */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginBottom: '0.6rem',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <BookOpen size={15} color="var(--accent-primary)" />
              <span>Front Matter &amp; Title Page</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Option 1: Include Cover */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={e => setIncludeCover(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                  />
                  <ImageIcon size={15} color="#818cf8" />
                  <span>Include Front Cover Image</span>
                </label>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginLeft: '2.1rem',
                    marginTop: '2px',
                  }}
                >
                  {book.coverImageUrl
                    ? 'Book cover graphic will be rendered on page 1 with full margins.'
                    : 'No cover image assigned yet (will be omitted if absent).'}
                </div>
              </div>

              {/* Option 4: Include Publish Date */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includePubDate}
                    onChange={e => setIncludePubDate(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                  />
                  <Calendar size={15} color="#f59e0b" />
                  <span>Include Publisher &amp; Publish Date on Title Page</span>
                </label>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginLeft: '2.1rem',
                    marginTop: '2px',
                  }}
                >
                  {book.metadata.publisher || book.metadata.pubdate
                    ? `Displays: "${[book.metadata.publisher, book.metadata.pubdate].filter(Boolean).join(' • ')}"`
                    : 'Prints publisher imprint and publication year near the bottom of the title page.'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Chapter Headings & Ornaments */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginBottom: '0.6rem',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <Settings size={15} color="var(--accent-primary)" />
              <span>Chapter Headings &amp; Styling</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Option 2: Automatically Add Chapter Titles */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeChapterTitles}
                    onChange={e => setIncludeChapterTitles(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                  />
                  <span>Automatically Add Chapter Titles</span>
                </label>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginLeft: '1.6rem',
                    marginTop: '2px',
                  }}
                >
                  Typeset prominent bold chapter title at the top of each chapter opening. Disable if chapter headings are already typed directly inside chapter bodies.
                </div>
              </div>

              {/* Option 3: Include ~ • ~ Ornament */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeOrnament}
                    onChange={e => setIncludeOrnament(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                  />
                  <Sparkles size={15} color="#e6be75" />
                  <span>
                    Include <code style={{ color: 'var(--accent-primary)', padding: '0 4px' }}>~ • ~</code> Decorative Ornament
                  </span>
                </label>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginLeft: '2.1rem',
                    marginTop: '2px',
                  }}
                >
                  Renders traditional literary three-point glyph divider beneath chapter titles and at scene breaks.
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Table of Contents (None / Start / End) */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginBottom: '0.6rem',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <List size={15} color="#60a5fa" />
              <span>Table of Contents (TOC)</span>
            </div>

            <div
              style={{
                background: 'var(--bg-input)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                Position of the Table of Contents within the typeset book:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setTocPosition('none')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${tocPosition === 'none' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    background: tocPosition === 'none' ? 'rgba(52, 211, 153, 0.12)' : 'var(--bg-surface)',
                    color: tocPosition === 'none' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: tocPosition === 'none' ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '0.82rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>None</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    No TOC
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTocPosition('start')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${tocPosition === 'start' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    background: tocPosition === 'start' ? 'rgba(52, 211, 153, 0.12)' : 'var(--bg-surface)',
                    color: tocPosition === 'start' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: tocPosition === 'start' ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '0.82rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>Start</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Front Matter
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTocPosition('end')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${tocPosition === 'end' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    background: tocPosition === 'end' ? 'rgba(52, 211, 153, 0.12)' : 'var(--bg-surface)',
                    color: tocPosition === 'end' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: tocPosition === 'end' ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '0.82rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>End</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Back Matter
                  </div>
                </button>
              </div>

              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                {tocPosition === 'none' && 'Omits Table of Contents. Best for short novellas or single-story drafts.'}
                {tocPosition === 'start' && 'Places Table of Contents immediately after the Title Page with exact chapter page numbers and leader dots.'}
                {tocPosition === 'end' && 'Appends Table of Contents following the final chapter (traditional European publishing style).'}
              </div>
            </div>
          </div>

          {/* Section 4: Format & Dimensions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Trim Size / Paper Dimensions</label>
              <select
                className="form-input"
                value={trimSize}
                onChange={e => setTrimSize(e.target.value as '6x9' | '5.5x8.5' | 'a4' | 'letter')}
              >
                <option value="6x9">6 × 9 in (Standard Trade Paperback)</option>
                <option value="5.5x8.5">5.5 × 8.5 in (Digest Paperback)</option>
                <option value="a4">A4 Standard (210 × 297 mm)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Body Typeface</label>
              <select
                className="form-input"
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value as 'times' | 'helvetica')}
              >
                <option value="times">Times (Literary Serif / Classic Book)</option>
                <option value="helvetica">Helvetica (Modern / Clean Sans)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', display: 'flex' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handlePrintPreview}
            title="Open printable 6×9 browser view"
          >
            <Printer size={15} />
            <span>Print Preview</span>
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isGenerating}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportPdf}
              disabled={isGenerating}
              style={{ minWidth: '170px' }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Typesetting PDF...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Export Vector PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
