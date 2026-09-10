import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import { X, FileSpreadsheet, Download, Loader2, User, Settings } from 'lucide-react';
import { exportToShunnDocx } from '../../services/epub/multiExport';
import { ShunnExportOptions } from '../../services/epub/shunnManuscriptExporter';
import { getStoredSettings, updateStoredSettings } from '../../services/epub/settingsStorage';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface ShunnSetupModalProps {
  onClose: () => void;
}

export const ShunnSetupModal: React.FC<ShunnSetupModalProps> = ({ onClose }) => {
  const { book, showNotification } = useEpub();
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEscapeKey(onClose);

  // Load persistent user preferences
  const saved = getStoredSettings();
  const [legalName, setLegalName] = useState<string>(saved.shunnLegalName || book?.metadata.creator || '');
  const [penName, setPenName] = useState<string>(saved.shunnPenName || book?.metadata.creator || '');
  const [authorEmail, setAuthorEmail] = useState<string>(saved.shunnAuthorEmail || book?.metadata.rights || 'author@example.com');
  const [addressLine1, setAddressLine1] = useState<string>(saved.shunnAddressLine1 || '');
  const [addressLine2, setAddressLine2] = useState<string>(saved.shunnAddressLine2 || '');
  const [authorPhone, setAuthorPhone] = useState<string>(saved.shunnAuthorPhone || '');
  const [chapterPageBreak, setChapterPageBreak] = useState<boolean>(saved.shunnChapterPageBreak !== undefined ? saved.shunnChapterPageBreak : true);
  const [includeChapterTitles, setIncludeChapterTitles] = useState<boolean>(saved.shunnIncludeChapterTitles !== undefined ? saved.shunnIncludeChapterTitles : true);
  const [fontFamily, setFontFamily] = useState<'Times New Roman' | 'Courier New'>(saved.shunnFontFamily || 'Times New Roman');

  if (!book) return null;

  const handleExport = async () => {
    try {
      setIsGenerating(true);
      showNotification('info', 'Compiling Shunn Modern Manuscript in standard DOCX format...');

      // Save for future exports
      updateStoredSettings({
        shunnLegalName: legalName,
        shunnPenName: penName,
        shunnAuthorEmail: authorEmail,
        shunnAuthorPhone: authorPhone,
        shunnAddressLine1: addressLine1,
        shunnAddressLine2: addressLine2,
        shunnChapterPageBreak: chapterPageBreak,
        shunnIncludeChapterTitles: includeChapterTitles,
        shunnFontFamily: fontFamily,
      });

      const options: ShunnExportOptions = {
        legalName: legalName.trim() || book.metadata.creator || 'Author Name',
        penName: penName.trim() || legalName.trim() || book.metadata.creator || 'Author Name',
        authorEmail: authorEmail.trim(),
        authorAddressLine1: addressLine1.trim(),
        authorAddressLine2: addressLine2.trim(),
        authorPhone: authorPhone.trim(),
        chapterPageBreak,
        includeChapterTitles,
        fontFamily,
        fontSize: 12,
      };

      await exportToShunnDocx(book, options);
      showNotification('success', `Exported "${book.metadata.title}_Shunn_Manuscript.docx" successfully!`);
      onClose();
    } catch (err: any) {
      console.error(err);
      showNotification('error', `Failed to generate Shunn manuscript: ${err?.message || 'Error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(96, 165, 250, 0.15)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="modal-title">Shunn Modern Manuscript Setup</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Format standard submission manuscript for literary agents & publishers
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Section 1: Contact Block */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
              <User size={15} color="var(--accent-primary)" />
              <span>Author & Submitter Contact Block (Page 1 Top-Left)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Legal Name (For checks / contract)</label>
                <input
                  type="text"
                  className="form-input"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  placeholder="e.g. Samuel Clemens"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Byline / Pen Name (On title block)</label>
                <input
                  type="text"
                  className="form-input"
                  value={penName}
                  onChange={e => setPenName(e.target.value)}
                  placeholder="e.g. Mark Twain"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={authorEmail}
                  onChange={e => setAuthorEmail(e.target.value)}
                  placeholder="author@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={authorPhone}
                  onChange={e => setAuthorPhone(e.target.value)}
                  placeholder="+1 (555) 012-3456"
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Address Line 1 (Street address, P.O. Box)</label>
                <input
                  type="text"
                  className="form-input"
                  value={addressLine1}
                  onChange={e => setAddressLine1(e.target.value)}
                  placeholder="e.g. 123 Writer's Lane"
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Address Line 2 (Apt, Suite, City, State, ZIP, Country)</label>
                <input
                  type="text"
                  className="form-input"
                  value={addressLine2}
                  onChange={e => setAddressLine2(e.target.value)}
                  placeholder="e.g. Apt 4B, New York, NY 10001, USA"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Chapter & Structure Options */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Settings size={15} color="var(--accent-secondary)" />
              <span>Chapter Separation & Layout Options</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Chapter Page Break Option */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Chapter Separation:
                </label>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${chapterPageBreak ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setChapterPageBreak(true)}
                  >
                    Start chapters on New Page (Books)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${!chapterPageBreak ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setChapterPageBreak(false)}
                  >
                    Continue with Blank Line (Short Stories)
                  </button>
                </div>
              </div>

              {/* Include Chapter Titles Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: 'var(--bg-input)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeChapterTitles}
                  onChange={e => setIncludeChapterTitles(e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Include Chapter Titles Automatically</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Outputs centered uppercase titles (e.g. CHAPTER 1) before each chapter body
                  </div>
                </div>
              </label>

              {/* Font Selection */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-input)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Manuscript Font</span>
                <select
                  className="form-select"
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value as any)}
                  style={{ width: '200px' }}
                >
                  <option value="Times New Roman">Times New Roman (12pt)</option>
                  <option value="Courier New">Courier New (12pt Mono)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Compiling Manuscript...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Download Shunn Manuscript (.docx)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
