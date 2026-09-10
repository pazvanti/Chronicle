import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEpub } from '../../context/EpubContext';
import { listFiles, deleteFile, uploadFile, createFolder } from '../../services/cloud/webdavClient';
import { WebDavFileItem } from '../../types/cloud';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import {
  Cloud,
  X,
  RefreshCw,
  FolderTree,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderUp,
  ChevronRight,
  FileText,
  BookOpen,
  Trash2,
  Upload,
  Settings,
  Search,
  AlertCircle,
  Loader2,
  FileCode,
} from 'lucide-react';
import { WebDavConfigModal } from './WebDavConfigModal';

interface CloudFileBrowserModalProps {
  onClose: () => void;
}

export const CloudFileBrowserModal: React.FC<CloudFileBrowserModalProps> = ({ onClose }) => {
  const {
    webdavConfig,
    isWebDavConnected,
    loadFromCloud,
    showNotification,
  } = useEpub();

  useEscapeKey(onClose);

  const [currentSubPath, setCurrentSubPath] = useState<string>('');
  const [files, setFiles] = useState<WebDavFileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const fetchFileList = useCallback(async (targetSubPath: string = currentSubPath) => {
    if (!webdavConfig || !isWebDavConnected) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const items = await listFiles(webdavConfig, targetSubPath);
      setFiles(items);
    } catch (err: any) {
      console.error('Failed to list files:', err);
      setError(err.message || 'Failed to list files from WebDAV server.');
    } finally {
      setIsLoading(false);
    }
  }, [webdavConfig, isWebDavConnected, currentSubPath]);

  useEffect(() => {
    fetchFileList(currentSubPath);
  }, [fetchFileList, currentSubPath]);

  const handleOpenFolder = (folderName: string) => {
    const nextSubPath = currentSubPath ? `${currentSubPath}/${folderName}` : folderName;
    setCurrentSubPath(nextSubPath);
    setSearchQuery('');
  };

  const handleNavigateUp = () => {
    if (!currentSubPath) return;
    const parts = currentSubPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentSubPath(parts.join('/'));
    setSearchQuery('');
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentSubPath('');
    } else {
      const parts = currentSubPath.split('/').filter(Boolean);
      setCurrentSubPath(parts.slice(0, index + 1).join('/'));
    }
    setSearchQuery('');
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webdavConfig) return;
    const name = newFolderName.trim();
    if (!name) return;

    try {
      const created = await createFolder(webdavConfig, name, currentSubPath);
      if (created) {
        showNotification('success', `Created folder "${name}" in cloud storage.`);
        setNewFolderName('');
        setIsCreatingFolder(false);
        fetchFileList(currentSubPath);
      } else {
        showNotification('error', `Failed to create folder "${name}".`);
      }
    } catch (err: any) {
      showNotification('error', `Error creating folder: ${err.message || 'Error'}`);
    }
  };

  const handleOpenFile = async (file: WebDavFileItem) => {
    try {
      onClose();
      await loadFromCloud(file.href, file.name, false, file.relativePath);
    } catch (err: any) {
      showNotification('error', `Failed to open cloud manuscript: ${err.message || 'Error'}`);
    }
  };

  const handleDeleteFile = async (file: WebDavFileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!webdavConfig) return;
    const isDir = file.isDirectory;
    const confirmMessage = isDir
      ? `Are you sure you want to delete the folder "${file.name}"? Note: WebDAV servers usually require folders to be empty before deleting.`
      : `Are you sure you want to delete "${file.name}" from your cloud storage?`;

    if (window.confirm(confirmMessage)) {
      try {
        await deleteFile(webdavConfig, file.href);
        setFiles(prev => prev.filter(f => f.href !== file.href));
        showNotification('success', `Deleted "${file.name}" from cloud.`);
      } catch (err: any) {
        showNotification('error', `Failed to delete ${isDir ? 'folder' : 'file'}: ${err.message || 'Error'}`);
      }
    }
  };

  const handleUploadLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !webdavConfig) return;

    setIsUploading(true);
    try {
      await uploadFile(webdavConfig, file.name, file, currentSubPath);
      showNotification('success', `Uploaded "${file.name}" to cloud folder.`);
      await fetchFileList(currentSubPath);
    } catch (err: any) {
      showNotification('error', `Upload failed: ${err.message || 'Error'}`);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string | null): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (isConfigOpen) {
    return (
      <WebDavConfigModal
        onClose={() => setIsConfigOpen(false)}
        onSuccess={() => {
          setIsConfigOpen(false);
          fetchFileList();
        }}
      />
    );
  }

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 210 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '780px', width: '94%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <Cloud size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                Cloud Manuscripts (WebDAV)
              </h3>
              {webdavConfig && (
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {webdavConfig.remotePath || '/'} on {new URL(webdavConfig.serverUrl).hostname}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              className="btn-icon btn-sm"
              onClick={() => setIsConfigOpen(true)}
              title="Cloud Settings"
            >
              <Settings size={16} />
            </button>
            <button className="btn-icon btn-sm" onClick={onClose} title="Close (Esc)">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Hidden upload input */}
        <input
          type="file"
          ref={uploadInputRef}
          onChange={handleUploadLocalFile}
          accept=".chronicle,.epub,.epubstudio,.eproj"
          style={{ display: 'none' }}
        />

        {/* Not Configured State */}
        {(!webdavConfig || !isWebDavConnected) ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <Cloud size={30} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
                WebDAV Cloud Not Configured
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.45 }}>
                Connect your Nextcloud, ownCloud, or generic WebDAV server to load, save, and auto-sync manuscripts seamlessly.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsConfigOpen(true)}
              style={{ marginTop: '0.5rem' }}
            >
              <Settings size={15} />
              <span>Configure WebDAV Storage</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '1rem 1.25rem' }}>
            {/* Toolbar: Search, Refresh, Upload */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2rem', height: '32px', fontSize: '0.82rem' }}
                  placeholder="Filter manuscripts..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={isUploading}
                  title="Upload .chronicle or .epub from computer to cloud"
                >
                  {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  <span>Upload</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchFileList()}
                  disabled={isLoading}
                  title="Refresh file list"
                >
                  <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Breadcrumb Navigation & New Folder Bar */}
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
                  <span>{webdavConfig?.remotePath || '/'}</span>
                </button>

                {/* Subfolder crumbs */}
                {currentSubPath.split('/').filter(Boolean).map((seg, idx, arr) => {
                  const isLast = idx === arr.length - 1;
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

              {/* New Folder Toggle */}
              <button
                type="button"
                className={`btn btn-sm ${isCreatingFolder ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                title="Create a new sub-folder in this directory"
                style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
              >
                <FolderPlus size={13} />
                <span>New Folder</span>
              </button>
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
                  placeholder="Enter folder name (e.g. Series, Drafts)..."
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

            {/* Error banner */}
            {error && (
              <div
                style={{
                  padding: '0.75rem 0.9rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  fontSize: '0.82rem',
                  color: '#ef4444',
                  marginBottom: '1rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>{error}</div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsConfigOpen(true)}
                  style={{ color: '#ef4444', padding: '2px 6px', fontSize: '0.75rem' }}
                >
                  Check Settings
                </button>
              </div>
            )}

            {/* File List */}
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
                  <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 0.75rem auto', color: 'var(--accent-primary)' }} />
                  <div style={{ fontSize: '0.85rem' }}>Listing files from WebDAV folder...</div>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FolderTree size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.3rem' }}>
                    {searchQuery ? 'No manuscripts or folders match your filter' : 'This folder is empty'}
                  </div>
                  <div style={{ fontSize: '0.78rem', maxWidth: '380px', margin: '0 auto', lineHeight: 1.4 }}>
                    {searchQuery
                      ? 'Try adjusting your search terms.'
                      : currentSubPath
                      ? `No files or subfolders found in "${currentSubPath}". Click "Upload" to add manuscripts or "New Folder" to create subdirectories.`
                      : `Files saved to cloud will appear in "${webdavConfig?.remotePath || '/'}". Click Upload to add a manuscript.`}
                  </div>
                  {currentSubPath && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleNavigateUp}
                      style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}
                    >
                      <FolderUp size={13} />
                      <span>Back to Parent Folder</span>
                    </button>
                  )}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '0.55rem 0.85rem', fontWeight: 600 }}>File Name</th>
                      <th style={{ padding: '0.55rem 0.85rem', fontWeight: 600, width: '110px' }}>Type</th>
                      <th style={{ padding: '0.55rem 0.85rem', fontWeight: 600, width: '90px' }}>Size</th>
                      <th style={{ padding: '0.55rem 0.85rem', fontWeight: 600, width: '140px' }}>Modified</th>
                      <th style={{ padding: '0.55rem 0.85rem', fontWeight: 600, width: '130px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map(file => {
                      const isManuscript = file.isManuscript;
                      const isDir = file.isDirectory;
                      return (
                        <tr
                          key={file.href}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: isDir || isManuscript ? 'pointer' : 'default',
                            transition: 'background-color 0.15s ease',
                          }}
                          className="cloud-file-row"
                          onClick={() => {
                            if (isDir) {
                              handleOpenFolder(file.name);
                            } else if (isManuscript) {
                              handleOpenFile(file);
                            }
                          }}
                        >
                          {/* Name with Icon */}
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                              {file.type === 'chronicle' ? (
                                <FileCode size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                              ) : file.type === 'epub' ? (
                                <BookOpen size={16} color="#10b981" style={{ flexShrink: 0 }} />
                              ) : isDir ? (
                                <Folder size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                              ) : (
                                <FileText size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                              )}
                              <span
                                style={{
                                  fontWeight: isDir || isManuscript ? 600 : 400,
                                  color: isDir
                                    ? '#fbbf24'
                                    : isManuscript
                                    ? 'var(--text-primary)'
                                    : 'var(--text-muted)',
                                }}
                              >
                                {file.name}
                              </span>
                            </div>
                          </td>

                          {/* Type Badge */}
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            {file.type === 'chronicle' ? (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                  color: 'var(--accent-primary)',
                                }}
                              >
                                Chronicle
                              </span>
                            ) : file.type === 'epub' ? (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                }}
                              >
                                EPUB
                              </span>
                            ) : isDir ? (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                  color: '#fbbf24',
                                }}
                              >
                                Folder
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>File</span>
                            )}
                          </td>

                          {/* Size */}
                          <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                            {isDir ? '—' : formatFileSize(file.size)}
                          </td>

                          {/* Modified Date */}
                          <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                            {formatDate(file.lastModified)}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                              {isDir ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleOpenFolder(file.name);
                                  }}
                                  style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                                  title={`Open folder "${file.name}"`}
                                >
                                  <FolderOpen size={12} />
                                  <span>Open</span>
                                </button>
                              ) : isManuscript ? (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleOpenFile(file);
                                  }}
                                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                  title="Open this manuscript in Chronicle"
                                >
                                  Open
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="btn-icon btn-sm"
                                onClick={e => handleDeleteFile(file, e)}
                                title={isDir ? `Delete folder "${file.name}"` : `Delete "${file.name}"`}
                                style={{ color: 'var(--text-muted)' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {filteredFiles.length} item{filteredFiles.length === 1 ? '' : 's'} found
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
