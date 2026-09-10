import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  X,
  Download,
  Printer,
  FileText,
  FileCode,
  Database,
  BookMarked,
  FileType,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  exportToMarkdown,
  exportToPlainText,
  exportToSingleHtml,
  exportToJson,
  openPrintPdfView,
  exportToPdfDirect,
} from '../../services/epub/multiExport';

import { ShunnSetupModal } from './ShunnSetupModal';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface ExportModalProps {
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const { book, exportAndDownload, isLoading, showNotification } = useEpub();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isShunnModalOpen, setIsShunnModalOpen] = useState<boolean>(false);

  useEscapeKey(onClose);

  if (!book) return null;

  const handleExportEpub = async () => {
    await exportAndDownload();
    onClose();
  };

  const handleExportPdfDirect = async () => {
    try {
      setIsGeneratingPdf(true);
      showNotification('info', 'Typesetting publication-grade vector text PDF...');
      await exportToPdfDirect(book);
      showNotification('success', `Exported "${book.metadata.title}.pdf" (Vector Text) successfully!`);
      onClose();
    } catch (err: any) {
      console.error(err);
      showNotification('error', `Failed to generate PDF: ${err?.message || 'Error'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenShunnModal = () => {
    setIsShunnModalOpen(true);
  };

  const handleExportMarkdown = () => {
    exportToMarkdown(book);
    onClose();
  };

  const handleExportPlainText = () => {
    exportToPlainText(book);
    onClose();
  };

  const handleExportSingleHtml = () => {
    exportToSingleHtml(book);
    onClose();
  };

  const handleExportJson = () => {
    exportToJson(book);
    onClose();
  };

  const handlePrintPdf = () => {
    openPrintPdfView(book);
    onClose();
  };

  const exportFormats = [
    {
      id: 'epub',
      title: 'Standard EPUB (.epub)',
      desc: 'IDPF-compliant publication package ready for Apple Books, Amazon Kindle, Kobo, Google Play, and e-readers.',
      icon: <BookMarked size={24} color="#818cf8" />,
      badge: 'E-Reader Release',
      action: handleExportEpub,
      btnClass: 'btn-primary',
      isLoading: isLoading,
    },
    {
      id: 'shunn-docx',
      title: 'Shunn Modern Manuscript (.docx)',
      desc: 'William Shunn industry-standard submission format for publishers & agents (1-inch margins, double spaced 12pt Times, running headers, word count & contact block).',
      icon: <FileSpreadsheet size={24} color="#60a5fa" />,
      badge: 'Publisher Gold Standard',
      action: handleOpenShunnModal,
      btnClass: 'btn-primary',
      isLoading: false,
    },
    {
      id: 'pdf-direct',
      title: 'Print-Ready Vector PDF (.pdf)',
      desc: 'Generates a publication-grade vector text PDF (100% searchable, selectable text, 300+ DPI print-ready for Amazon KDP 6×9 trade paperback, running headers, and page numbering).',
      icon: <FileType size={24} color="#34d399" />,
      badge: 'Vector Text • KDP Ready',
      action: handleExportPdfDirect,
      btnClass: 'btn-primary',
      isLoading: isGeneratingPdf,
    },
    {
      id: 'markdown',
      title: 'Markdown Manuscript (.md)',
      desc: 'Complete manuscript formatted as clean Markdown with YAML metadata frontmatter.',
      icon: <FileText size={24} color="#38bdf8" />,
      badge: 'Markdown',
      action: handleExportMarkdown,
      btnClass: 'btn-secondary',
      isLoading: false,
    },
    {
      id: 'html',
      title: 'Single HTML Bundle (.html)',
      desc: 'Self-contained offline readable document with all chapters and embedded styling.',
      icon: <FileCode size={24} color="#f59e0b" />,
      badge: 'Web Document',
      action: handleExportSingleHtml,
      btnClass: 'btn-secondary',
      isLoading: false,
    },
    {
      id: 'txt',
      title: 'Plain Text (.txt)',
      desc: 'Raw formatted text document with uppercase chapter headings and dividers.',
      icon: <FileText size={24} color="#94a3b8" />,
      badge: 'Text',
      action: handleExportPlainText,
      btnClass: 'btn-secondary',
      isLoading: false,
    },
    {
      id: 'print-view',
      title: 'Print Preview & Printer Setup',
      desc: 'Opens 6×9 in printable book view formatted with headers for physical paper printing.',
      icon: <Printer size={24} color="#a78bfa" />,
      badge: 'Print Window',
      action: handlePrintPdf,
      btnClass: 'btn-secondary',
      isLoading: false,
    },
    {
      id: 'json',
      title: 'JSON Backup Archive (.json)',
      desc: 'Machine-readable structural backup containing metadata, spine, TOC, and chapters.',
      icon: <Database size={24} color="#c084fc" />,
      badge: 'Backup',
      action: handleExportJson,
      btnClass: 'btn-secondary',
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Download size={18} />
            </div>
            <div>
              <h2 className="modal-title">Export Book & Multi-Format Hub</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Export "{book.metadata.title}" into your preferred format
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '0.75rem', maxHeight: '65vh' }}>
          {exportFormats.map(fmt => (
            <div
              key={fmt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.2rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)' }}>
                  {fmt.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {fmt.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.45rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {fmt.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '400px' }}>
                    {fmt.desc}
                  </p>
                </div>
              </div>

              <button
                className={`btn btn-sm ${fmt.btnClass}`}
                onClick={fmt.action}
                disabled={fmt.isLoading || isLoading}
                style={{ flexShrink: 0, minWidth: '95px' }}
              >
                {fmt.isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Working...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Export</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {isShunnModalOpen && (
        <ShunnSetupModal onClose={() => setIsShunnModalOpen(false)} />
      )}
    </div>
  );
};
