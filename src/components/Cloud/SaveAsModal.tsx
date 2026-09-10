import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import { StorageTarget } from '../../types/cloud';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import {
  Save,
  HardDrive,
  Cloud,
  X,
  Check,
  FolderTree,
  FileCode,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { WebDavConfigModal } from './WebDavConfigModal';
import { CloudFolderPickerModal } from './CloudFolderPickerModal';

interface SaveAsModalProps {
  onClose: () => void;
}

export const SaveAsModal: React.FC<SaveAsModalProps> = ({ onClose }) => {
  const {
    book,
    storageTarget,
    cloudFileName,
    webdavConfig,
    isWebDavConnected,
    saveAs,
    showNotification,
  } = useEpub();

  useEscapeKey(onClose);

  const initialCleanTitle = (book?.metadata.title || 'manuscript').replace(/[^a-zA-Z0-9_-]/g, '_');

  // Extract initial subfolder and filename if previous cloud path existed
  const extractPathAndName = (fullPath: string | null) => {
    if (!fullPath) return { dir: '', file: `${initialCleanTitle}.chronicle` };
    const parts = fullPath.split('/');
    if (parts.length > 1) {
      const file = parts.pop()!;
      return { dir: parts.join('/'), file: file || `${initialCleanTitle}.chronicle` };
    }
    return { dir: '', file: fullPath };
  };

  const parsed = extractPathAndName(cloudFileName);

  const [target, setTarget] = useState<StorageTarget>(storageTarget || 'cloud');
  const [selectedSubPath, setSelectedSubPath] = useState<string>(parsed.dir);
  const [filename, setFilename] = useState<string>(parsed.file);
  const [isConfiguringWebDav, setIsConfiguringWebDav] = useState<boolean>(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let cleanName = filename.trim();
    if (!cleanName) {
      cleanName = `${initialCleanTitle}.chronicle`;
    }
    if (!cleanName.endsWith('.chronicle')) {
      cleanName += '.chronicle';
    }

    if (target === 'cloud' && (!webdavConfig || !isWebDavConnected)) {
      setIsConfiguringWebDav(true);
      return;
    }

    setIsSaving(true);
    try {
      if (target === 'cloud') {
        await saveAs(target, cleanName, selectedSubPath);
      } else {
        await saveAs(target, cleanName);
      }
      onClose();
    } catch (err: any) {
      showNotification('error', `Save As failed: ${err.message || 'Error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isConfiguringWebDav) {
    return (
      <WebDavConfigModal
        onClose={() => setIsConfiguringWebDav(false)}
        onSuccess={() => {
          setIsConfiguringWebDav(false);
        }}
      />
    );
  }

  const rootDisplay = (webdavConfig?.remotePath || '/').replace(/\/+$/, '');
  const displayRemoteFolder = selectedSubPath
    ? `${rootDisplay}/${selectedSubPath}/`
    : `${rootDisplay}/`;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 215 }}>
        <div
          className="modal-card"
          style={{ maxWidth: '520px', width: '92%' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <Save size={18} />
              </div>
              <div>
                <h3 className="modal-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                  Save Manuscript As...
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Switch storage location between local computer and WebDAV cloud
                </p>
              </div>
            </div>
            <button className="btn-icon btn-sm" onClick={onClose} title="Cancel (Esc)">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Target Selector */}
            <div>
              <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                Select Destination:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Local File */}
                <div
                  onClick={() => setTarget('local')}
                  style={{
                    padding: '0.9rem',
                    borderRadius: '10px',
                    border: target === 'local'
                      ? '2px solid var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                    backgroundColor: target === 'local'
                      ? 'rgba(99, 102, 241, 0.08)'
                      : 'var(--bg-card)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                      flexShrink: 0,
                    }}
                  >
                    <HardDrive size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Local File</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Save to this computer
                    </div>
                  </div>
                </div>

                {/* WebDAV Cloud */}
                <div
                  onClick={() => setTarget('cloud')}
                  style={{
                    padding: '0.9rem',
                    borderRadius: '10px',
                    border: target === 'cloud'
                      ? '2px solid #3b82f6'
                      : '1px solid var(--border-subtle)',
                    backgroundColor: target === 'cloud'
                      ? 'rgba(59, 130, 246, 0.08)'
                      : 'var(--bg-card)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#3b82f6',
                      flexShrink: 0,
                    }}
                  >
                    <Cloud size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>WebDAV Cloud</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {isWebDavConnected ? 'Syncs with server' : 'Needs setup'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* If cloud selected and not configured */}
            {target === 'cloud' && (!webdavConfig || !isWebDavConnected) && (
              <div
                style={{
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  fontSize: '0.78rem',
                  color: '#d97706',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>WebDAV server configuration required before saving to cloud.</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsConfiguringWebDav(true)}
                  style={{ padding: '3px 8px', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  <Settings size={12} />
                  <span>Configure</span>
                </button>
              </div>
            )}

            {/* Target Folder Selector when Cloud Selected */}
            {target === 'cloud' && isWebDavConnected && webdavConfig && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <FolderTree size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Destination folder: </span>
                    <code style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{displayRemoteFolder}</code>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsFolderPickerOpen(true)}
                  style={{ padding: '3px 9px', fontSize: '0.75rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Browse or create remote sub-folders"
                >
                  <FolderTree size={13} />
                  <span>Browse Folders...</span>
                </button>
              </div>
            )}

          {/* Filename Input */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <FileCode size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>File Name (.chronicle):</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={filename}
              onChange={e => setFilename(e.target.value)}
              placeholder="manuscript_name.chronicle"
              required
              autoFocus
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
              Will be saved in Chronicle master format, preserving all chapters, character profiles, settings codex, timelines, and assets.
            </span>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.6rem',
              marginTop: '0.3rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSaving}
            >
              <Check size={14} />
              <span>{isSaving ? 'Saving...' : `Save as ${target === 'cloud' ? 'Cloud File' : 'Local File'}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    {isFolderPickerOpen && (
      <CloudFolderPickerModal
        initialSubPath={selectedSubPath}
        onSelectFolder={(subPath) => setSelectedSubPath(subPath)}
        onClose={() => setIsFolderPickerOpen(false)}
      />
    )}
  </>
  );
};
