import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { HardDrive, Cloud, X, ArrowRight, Settings, Check } from 'lucide-react';
import { WebDavConfigModal } from './WebDavConfigModal';
import { isTauri } from '../../services/cloud/webdavClient';

interface SaveDestinationModalProps {
  onClose: () => void;
}

export const SaveDestinationModal: React.FC<SaveDestinationModalProps> = ({ onClose }) => {
  const {
    book,
    saveProject,
    webdavConfig,
    isWebDavConnected,
    setIsCloudDesktopNoticeOpen,
  } = useEpub();

  const [isConfiguringWebDav, setIsConfiguringWebDav] = useState<boolean>(false);

  useEscapeKey(onClose);

  const handleSaveLocal = async () => {
    onClose();
    await saveProject('local');
  };

  const handleSaveCloud = async () => {
    if (!isTauri()) {
      onClose();
      setIsCloudDesktopNoticeOpen(true);
      return;
    }
    if (!webdavConfig || !isWebDavConnected) {
      setIsConfiguringWebDav(true);
      return;
    }
    onClose();
    await saveProject('cloud');
  };

  const handleConfigSuccess = async () => {
    setIsConfiguringWebDav(false);
    onClose();
    await saveProject('cloud');
  };

  if (isConfiguringWebDav) {
    return (
      <WebDavConfigModal
        onClose={() => setIsConfiguringWebDav(false)}
        onSuccess={handleConfigSuccess}
      />
    );
  }

  const bookTitle = book?.metadata.title || 'Untitled Manuscript';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 210 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '540px', width: '92%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              Choose Save Destination
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Where would you like to save "{bookTitle}"?
            </p>
          </div>
          <button className="btn-icon btn-sm" onClick={onClose} title="Cancel (Esc)">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Subsequent saves (via <kbd className="kbd-shortcut">Ctrl+S</kbd> or the <strong>Save</strong> button) will automatically update this location without asking again. You can switch destinations anytime using <strong>Save As...</strong>.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            {/* Option 1: Local File */}
            <div
              onClick={handleSaveLocal}
              className="save-destination-card"
              style={{
                padding: '1.2rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-card)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.6rem',
                transition: 'all 0.18s ease',
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '12px',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <HardDrive size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  Local Computer
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                  Download standalone <code>.chronicle</code> project file to your disk.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', marginTop: 'auto', pointerEvents: 'none' }}
              >
                <span>Save Locally</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Option 2: WebDAV Cloud */}
            <div
              onClick={handleSaveCloud}
              className="save-destination-card"
              style={{
                padding: '1.2rem 1rem',
                borderRadius: '12px',
                border: isWebDavConnected
                  ? '1px solid rgba(59, 130, 246, 0.4)'
                  : '1px solid var(--border-subtle)',
                backgroundColor: isWebDavConnected
                  ? 'rgba(59, 130, 246, 0.04)'
                  : 'var(--bg-card)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.6rem',
                transition: 'all 0.18s ease',
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b82f6',
                }}
              >
                <Cloud size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  WebDAV Cloud
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                  {isWebDavConnected ? (
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <Check size={12} /> Connected to server
                    </span>
                  ) : (
                    'Sync automatically with Nextcloud, ownCloud, or WebDAV.'
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ width: '100%', marginTop: 'auto', pointerEvents: 'none' }}
              >
                <span>{isWebDavConnected ? 'Save to Cloud' : 'Setup & Save'}</span>
                {isWebDavConnected ? <ArrowRight size={13} /> : <Settings size={13} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
