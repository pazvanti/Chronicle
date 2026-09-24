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
} from '../../services/epub/multiExport';

import { ShunnSetupModal } from './ShunnSetupModal';
import { PdfSetupModal } from './PdfSetupModal';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useTranslation } from '../../i18n/I18nContext';

interface ExportModalProps {
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const { book, exportAndDownload, isLoading } = useEpub();
  const { t } = useTranslation();
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isShunnModalOpen, setIsShunnModalOpen] = useState<boolean>(false);

  useEscapeKey(onClose);

  if (!book) return null;

  const handleExportEpub = async () => {
    await exportAndDownload();
    onClose();
  };

  const handleOpenPdfModal = () => {
    setIsPdfModalOpen(true);
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
      title: t('exportModal.epubTitle'),
      desc: t('exportModal.epubDesc'),
      icon: <BookMarked size={24} color="#818cf8" />,
      badge: t('exportModal.epubBadge'),
      action: handleExportEpub,
      btnClass: 'btn-primary',
      isLoading: isLoading,
    },
    {
      id: 'shunn-docx',
      title: t('exportModal.shunnTitle'),
      desc: t('exportModal.shunnDesc'),
      icon: <FileSpreadsheet size={24} color="#60a5fa" />,
      badge: t('exportModal.shunnBadge'),
      action: handleOpenShunnModal,
      btnClass: 'btn-primary',
      isLoading: false,
    },
    {
      id: 'pdf-direct',
      title: t('exportModal.pdfTitle'),
      desc: t('exportModal.pdfDesc'),
      icon: <FileType size={24} color="#34d399" />,
      badge: t('exportModal.pdfBadge'),
      action: handleOpenPdfModal,
      btnClass: 'btn-primary',
      isLoading: false,
    },
    {
      id: 'markdown',
      title: t('exportModal.markdownTitle'),
      desc: t('exportModal.markdownDesc'),
      icon: <FileText size={24} color="#38bdf8" />,
      badge: t('exportModal.markdownBadge'),
      action: handleExportMarkdown,
      btnClass: 'btn-secondary',
      isLoading: false,
    },
    {
      id: 'html',
      title: t('exportModal.htmlTitle'),
      desc: t('exportModal.htmlDesc'),
      icon: <FileCode size={24} color="#f59e0b" />,
      badge: t('exportModal.htmlBadge'),
      action: handleExportSingleHtml,
      btnClass: 'btn-secondary',
      isLoading: false,
    },
    {
      id: 'txt',
      title: t('exportModal.txtTitle'),
      desc: t('exportModal.txtDesc'),
      icon: <FileText size={24} color="#94a3b8" />,
      badge: t('exportModal.txtBadge'),
      action: handleExportPlainText,
      btnClass: 'btn-secondary',
      isLoading: false,
    },
    {
      id: 'print-view',
      title: t('exportModal.printTitle'),
      desc: t('exportModal.printDesc'),
      icon: <Printer size={24} color="#a78bfa" />,
      badge: t('exportModal.printBadge'),
      action: handlePrintPdf,
      btnClass: 'btn-secondary',
      isLoading: false,
    },
    {
      id: 'json',
      title: t('exportModal.jsonTitle'),
      desc: t('exportModal.jsonDesc'),
      icon: <Database size={24} color="#c084fc" />,
      badge: t('exportModal.jsonBadge'),
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
              <h2 className="modal-title">{t('exportModal.title')}</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('exportModal.subtitle').replace('{title}', book.metadata.title)}
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
                    <span>{t('exportModal.working')}</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>{t('exportModal.exportBtn')}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>

      {isPdfModalOpen && (
        <PdfSetupModal onClose={() => setIsPdfModalOpen(false)} />
      )}
      {isShunnModalOpen && (
        <ShunnSetupModal onClose={() => setIsShunnModalOpen(false)} />
      )}
    </div>
  );
};
