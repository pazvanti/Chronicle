import React, { useState, useEffect, useCallback } from 'react';
import { useEpub } from '../../context/EpubContext';
import { listFiles, createFolder } from '../../services/cloud/webdavClient';
import { WebDavFileItem } from '../../types/cloud';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FolderUp,
  ChevronRight,
  X,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
  FolderTree,
} from 'lucide-react';

interface CloudFolderPickerModalProps {
  initialSubPath?: string;
  onSelectFolder: (subPath: string) => void;
  onClose: () => void;
}

export const CloudFolderPickerModal: React.FC<CloudFolderPickerModalProps> = ({
  initialSubPath = '',
  onSelectFolder,
  onClose,
}) => {
  const { webdavConfig, isWebDavConnected, showNotification } = useEpub();

  useEscapeKey(onClose);

  const [currentSubPath, setCurrentSubPath] = useState<string>(initialSubPath);
  const [folders, setFolders] = useState<WebDavFileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  const fetchFolders = useCallback(
    async (targetSubPath: string = currentSubPath) => {
      if (!webdavConfig || !isWebDavConnected) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const items = await listFiles(webdavConfig, targetSubPath);
        setFolders(items.filter(item => item.isDirectory));
      } catch (err: any) {
        console.error('Failed to list folders:', err);
        setError(err.message || 'Failed to list folders from WebDAV server.');
      } finally {
        setIsLoading(false);
      }
    },
    [webdavConfig, isWebDavConnected, currentSubPath]
  );

  useEffect(() => {
    fetchFolders(currentSubPath);
  }, [fetchFolders, currentSubPath]);

  const handleOpenFolder = (folderName: string) => {
    const nextSubPath = currentSubPath ? `${currentSubPath}/${folderName}` : folderName;
    setCurrentSubPath(nextSubPath);
  };

  const handleNavigateUp = () => {
    if (!currentSubPath) return;
    const parts = currentSubPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentSubPath(parts.join('/'));
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentSubPath('');
    } else {
      const parts = currentSubPath.split('/').filter(Boolean);
      setCurrentSubPath(parts.slice(0, index + 1).join('/'));
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webdavConfig) return;
    const name = newFolderName.trim();
    if (!name) return;

    try {
      const created = await createFolder(webdavConfig, name, currentSubPath);
      if (created) {
        showNotification('success', `Created folder "${name}"`);
        setNewFolderName('');
        setIsCreatingFolder(false);
        fetchFolders(currentSubPath);
      } else {
        showNotification('error', `Failed to create folder "${name}".`);
      }
    } catch (err: any) {
      showNotification('error', `Error creating folder: ${err.message || 'Error'}`);
    }
  };

  const handleConfirmSelect = () => {
    onSelectFolder(currentSubPath);
    onClose();
  };

  const rootDisplay = webdavConfig?.remotePath || '/';
  const currentDisplayPath = currentSubPath
    ? `${rootDisplay.replace(/\/+$/, '')}/${currentSubPath}/`
    : `${rootDisplay.replace(/\/+$/, '')}/`;

  const pathSegments = currentSubPath.split('/').filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 260 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '560px',
          width: '92%',
          height: '520px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-folder-picker-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3
              id="cloud-folder-picker-title"
              className="modal-title"
              style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FolderTree size={18} color="var(--accent-primary)" />
              <span>Select Cloud Destination Folder</span>
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Choose or create a subfolder on your WebDAV server to save your manuscript.
            </p>
          </div>
          <button className="btn-icon btn-sm" onClick={onClose} title="Cancel (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '1rem 1.25rem' }}>
          {/* Breadcrumb Navigation Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.4rem 0.65rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              marginBottom: '0.75rem',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflowX: 'auto', scrollbarWidth: 'none', flex: 1 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleNavigateUp}
                disabled={!currentSubPath || isLoading}
                title={currentSubPath ? 'Up one folder level' : 'At root folder'}
                style={{ padding: '2px 6px', height: '26px', opacity: currentSubPath ? 1 : 0.4 }}
              >
                <FolderUp size={14} />
              </button>

              <div className="header-divider" style={{ height: '14px', margin: '0 2px' }} />

              {/* Root crumb */}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => handleNavigateToBreadcrumb(-1)}
                style={{
                  padding: '2px 6px',
                  height: '26px',
                  fontSize: '0.78rem',
                  fontWeight: currentSubPath ? 500 : 700,
                  color: currentSubPath ? 'var(--text-secondary)' : 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Go to root folder"
              >
                <Folder size={13} color={currentSubPath ? 'var(--text-muted)' : 'var(--accent-primary)'} />
                <span>{rootDisplay}</span>
              </button>

              {/* Subfolder segments */}
              {pathSegments.map((seg, idx) => {
                const isLast = idx === pathSegments.length - 1;
                return (
                  <React.Fragment key={idx}>
                    <ChevronRight size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleNavigateToBreadcrumb(idx)}
                      style={{
                        padding: '2px 6px',
                        height: '26px',
                        fontSize: '0.78rem',
                        fontWeight: isLast ? 700 : 500,
                        color: isLast ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {seg}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => fetchFolders(currentSubPath)}
                disabled={isLoading}
                title="Refresh folders"
                style={{ padding: '2px 6px', height: '26px' }}
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                className={`btn btn-sm ${isCreatingFolder ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                title="Create a new sub-folder here"
                style={{ padding: '2px 8px', fontSize: '0.75rem', height: '26px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FolderPlus size={13} />
                <span>New Folder</span>
              </button>
            </div>
          </div>

          {/* Inline New Folder Form */}
          {isCreatingFolder && (
            <form
              onSubmit={handleCreateFolder}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 0.75rem',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                marginBottom: '0.75rem',
              }}
            >
              <Folder size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
              <input
                type="text"
                className="form-input"
                style={{ height: '28px', fontSize: '0.8rem', flex: 1 }}
                placeholder="New subfolder name..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ height: '28px', padding: '0 10px', fontSize: '0.75rem' }}
                disabled={!newFolderName.trim()}
              >
                Create
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ height: '28px', padding: '0 8px', fontSize: '0.75rem' }}
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
              >
                Cancel
              </button>
            </form>
          )}

          {/* Error Banner */}
          {error && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#ef4444',
                marginBottom: '0.75rem',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>{error}</div>
            </div>
          )}

          {/* Folder List Container */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-main)',
            }}
          >
            {isLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.6rem auto', color: 'var(--accent-primary)' }} />
                <div style={{ fontSize: '0.82rem' }}>Scanning cloud directories...</div>
              </div>
            ) : folders.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Folder size={32} style={{ margin: '0 auto 0.6rem auto', opacity: 0.35, color: '#f59e0b' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  No sub-folders in this location
                </div>
                <div style={{ fontSize: '0.78rem', maxWidth: '340px', margin: '0 auto', lineHeight: 1.45 }}>
                  Click <strong>"Select This Folder"</strong> below to save here, or click <strong>"New Folder"</strong> above to create a sub-directory.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {folders.map(f => (
                  <div
                    key={f.href}
                    onClick={() => handleOpenFolder(f.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.9rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="cloud-file-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Folder size={17} color="#f59e0b" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff' }}>{f.name}</span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenFolder(f.name);
                      }}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', gap: '3px' }}
                    >
                      <FolderOpen size={12} />
                      <span>Open</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            Target: <strong style={{ color: '#ffffff' }}>{currentDisplayPath}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConfirmSelect}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Check size={14} />
              <span>Select This Folder</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
