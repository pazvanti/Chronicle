import React, { useState, useEffect } from 'react';
import { useEpub } from '../../context/EpubContext';
import { testConnection, isTauri } from '../../services/cloud/webdavClient';
import { WebDavConfig } from '../../types/cloud';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import {
  Cloud,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Server,
  User,
  KeyRound,
  FolderTree,
  ShieldCheck,
  Trash2,
  HelpCircle,
} from 'lucide-react';

interface WebDavConfigModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const WebDavConfigModal: React.FC<WebDavConfigModalProps> = ({ onClose, onSuccess }) => {
  const { webdavConfig, updateWebDavConfig, showNotification } = useEpub();

  useEscapeKey(onClose);

  const [serverUrl, setServerUrl] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [remotePath, setRemotePath] = useState<string>('/Chronicle/');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  useEffect(() => {
    if (webdavConfig) {
      setServerUrl(webdavConfig.serverUrl || '');
      setUsername(webdavConfig.username || '');
      setPassword(webdavConfig.password || '');
      setRemotePath(webdavConfig.remotePath || '/Chronicle/');
    }
  }, [webdavConfig]);

  const handleTest = async () => {
    if (!serverUrl.trim() || !username.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter both Server URL and Username.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const configToTest: WebDavConfig = {
        serverUrl: serverUrl.trim(),
        username: username.trim(),
        password: password,
        remotePath: remotePath.trim() || '/Chronicle/',
        connected: false,
      };

      const result = await testConnection(configToTest);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serverUrl.trim() || !username.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter both Server URL and Username.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const newConfig: WebDavConfig = {
        serverUrl: serverUrl.trim(),
        username: username.trim(),
        password: password,
        remotePath: remotePath.trim() || '/Chronicle/',
        connected: true,
        lastChecked: new Date().toISOString(),
      };

      await updateWebDavConfig(newConfig);
      showNotification('success', 'WebDAV cloud configuration saved to IndexedDB!');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      showNotification('error', `Failed to save configuration: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect and remove your WebDAV cloud configuration?')) {
      await updateWebDavConfig(null);
      setServerUrl('');
      setUsername('');
      setPassword('');
      setRemotePath('/Chronicle/');
      setTestResult(null);
      showNotification('info', 'WebDAV configuration removed.');
      onClose();
    }
  };

  if (!isTauri()) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 220 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '580px', width: '92%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <Cloud size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                Cloud Storage Settings (WebDAV)
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Sync manuscripts with Nextcloud, ownCloud, or generic WebDAV
              </p>
            </div>
          </div>
          <button className="btn-icon btn-sm" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Security & IndexedDB banner */}
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.55rem',
              fontSize: '0.8rem',
              lineHeight: 1.4,
              color: 'var(--text-secondary)',
            }}
          >
            <ShieldCheck size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              Credentials are securely stored locally in your browser’s <strong>IndexedDB</strong> (never in localStorage or third-party servers) and automatically re-loaded when you refresh.
            </div>
          </div>

          {/* Form Fields */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <Server size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>WebDAV Server URL</span>
              </label>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: 0,
                }}
              >
                <HelpCircle size={12} />
                <span>{showHelp ? 'Hide URL guide' : 'Nextcloud / ownCloud URL guide'}</span>
              </button>
            </div>

            {showHelp && (
              <div
                style={{
                  padding: '0.6rem 0.75rem',
                  marginBottom: '0.5rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.45,
                }}
              >
                <div><strong>Nextcloud / ownCloud WebDAV URL pattern:</strong></div>
                <code style={{ display: 'block', margin: '4px 0', padding: '3px 6px', background: 'var(--bg-main)', borderRadius: '4px' }}>
                  https://cloud.example.com/remote.php/dav/files/YOUR_USERNAME/
                </code>
                <div>You can find this in Nextcloud bottom-left &gt; <em>Files settings</em> &gt; <em>WebDAV</em>. (We recommend creating an <strong>App Password</strong> in Personal Settings &gt; Security).</div>
              </div>
            )}

            <input
              type="url"
              className="form-input"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              placeholder="https://cloud.example.com/remote.php/dav/files/username/"
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <User size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>Username</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your_username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <KeyRound size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>Password / Token</span>
              </label>
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="App password or token"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease, background-color 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <FolderTree size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>Remote Directory Folder</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={remotePath}
              onChange={e => setRemotePath(e.target.value)}
              placeholder="/Chronicle/ (will be auto-created if missing)"
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
              Path on your cloud storage where manuscripts will be saved (e.g. <code>/Chronicle/</code> or <code>/Books/</code>).
            </span>
          </div>

          {/* Test connection results */}
          {testResult && (
            <div
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.55rem',
                fontSize: '0.82rem',
                color: testResult.success ? '#10b981' : '#ef4444',
              }}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                {testResult.message}
              </div>
            </div>
          )}

          {/* Footer action buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              marginTop: '0.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              {webdavConfig && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleDisconnect}
                  style={{ color: '#ef4444' }}
                  title="Remove saved credentials from IndexedDB"
                >
                  <Trash2 size={14} />
                  <span>Disconnect</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleTest}
                disabled={isTesting || isSaving || !serverUrl.trim()}
              >
                {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSaving || isTesting || !serverUrl.trim() || !username.trim()}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
                <span>Save to IndexedDB</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
