import React, { useState, useEffect } from 'react';
import { useEpub } from '../../context/EpubContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { UI_THEMES } from '../../types/theme';
import { testConnection, isTauri } from '../../services/cloud/webdavClient';
import { WebDavConfig } from '../../types/cloud';
import { saveSetting } from '../../services/storage/indexedDbSettings';
import {
  Settings,
  X,
  Palette,
  Cloud,
  Sliders,
  Database,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server,
  User,
  KeyRound,
  FolderTree,
  Eye,
  EyeOff,
  Trash2,
  HelpCircle,
  Moon,
  Sun,
  Sparkles,
  Keyboard,
} from 'lucide-react';

export type SettingsTab = 'appearance' | 'cloud' | 'editor' | 'general';

interface SettingsModalProps {
  initialTab?: SettingsTab;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  initialTab = 'appearance',
  onClose,
}) => {
  const {
    uiTheme,
    setUiTheme,
    webdavConfig,
    isWebDavConnected,
    updateWebDavConfig,
    showNotification,
    readerTheme,
    setReaderTheme,
    readerFont,
    setReaderFont,
    readerMarginWidth,
    setReaderMarginWidth,
  } = useEpub();

  useEscapeKey(onClose);

  const isDesktop = isTauri();
  const effectiveInitialTab = (!isDesktop && initialTab === 'cloud') ? 'appearance' : initialTab;
  const [activeTab, setActiveTab] = useState<SettingsTab>(effectiveInitialTab);

  useEffect(() => {
    if (!isDesktop && initialTab === 'cloud') {
      setActiveTab('appearance');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isDesktop]);

  // Cloud WebDAV Form State
  const [serverUrl, setServerUrl] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [remotePath, setRemotePath] = useState<string>('/Chronicle/');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState<boolean>(false);
  const [showCloudHelp, setShowCloudHelp] = useState<boolean>(false);

  // General Preferences State
  const [showWelcomeOnStartup, setShowWelcomeOnStartup] = useState<boolean>(true);

  // Initialize WebDAV and general states
  useEffect(() => {
    if (webdavConfig) {
      setServerUrl(webdavConfig.serverUrl || '');
      setUsername(webdavConfig.username || '');
      setPassword(webdavConfig.password || '');
      setRemotePath(webdavConfig.remotePath || '/Chronicle/');
    }
  }, [webdavConfig]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chronicle_show_welcome_on_startup');
      if (saved !== null) {
        setShowWelcomeOnStartup(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleWelcome = async (checked: boolean) => {
    setShowWelcomeOnStartup(checked);
    await saveSetting('showWelcomeOnStartup', checked);
    try {
      localStorage.setItem('chronicle_show_welcome_on_startup', String(checked));
    } catch {
      // ignore
    }
    showNotification('info', checked ? 'Welcome guide will show on startup.' : 'Welcome guide disabled on startup.');
  };

  const handleTestCloudConnection = async () => {
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
      };

      const result = await testConnection(configToTest);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCloudConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serverUrl.trim() || !username.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter both Server URL and Username.',
      });
      return;
    }

    setIsSavingCloud(true);
    try {
      const newConfig: WebDavConfig = {
        serverUrl: serverUrl.trim(),
        username: username.trim(),
        password: password,
        remotePath: remotePath.trim() || '/Chronicle/',
        connected: true,
      };

      await updateWebDavConfig(newConfig);
      showNotification('success', 'WebDAV configuration saved to IndexedDB!');
      setTestResult({
        success: true,
        message: 'Configuration saved and connection active.',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to save configuration.',
      });
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleDisconnectCloud = async () => {
    if (window.confirm('Disconnect and remove stored WebDAV cloud credentials?')) {
      await updateWebDavConfig(null);
      setServerUrl('');
      setUsername('');
      setPassword('');
      setRemotePath('/Chronicle/');
      setTestResult(null);
      showNotification('info', 'WebDAV configuration removed from IndexedDB.');
    }
  };

  const allNavTabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'appearance', label: 'Appearance & Themes', icon: <Palette size={16} /> },
    {
      id: 'cloud',
      label: 'Cloud Storage',
      icon: <Cloud size={16} />,
      badge: isWebDavConnected ? 'Active' : undefined,
    },
    { id: 'editor', label: 'Editor & Reading', icon: <Sliders size={16} /> },
    { id: 'general', label: 'General & Storage', icon: <Database size={16} /> },
  ];

  const navTabs = isDesktop ? allNavTabs : allNavTabs.filter(tab => tab.id !== 'cloud');

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 280 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '820px',
          width: '94%',
          height: '620px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '16px',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '1rem 1.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                background: 'rgba(124, 58, 237, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <Settings size={18} />
            </div>
            <div>
              <h3 id="settings-dialog-title" className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                Settings & Preferences
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                All settings are stored in local browser IndexedDB and automatically restored on startup
              </p>
            </div>
          </div>
          <button className="btn-icon btn-sm" onClick={onClose} title="Close Settings (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body: Sidebar + Main Workspace */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left Navigation Sidebar */}
          <div
            style={{
              width: '210px',
              backgroundColor: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              padding: '0.85rem 0.6rem',
              gap: '0.25rem',
              flexShrink: 0,
            }}
          >
            {navTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--bg-surface-hover)' : 'transparent',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div style={{ marginTop: 'auto', padding: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <div>Chronicle Studio</div>
              <div style={{ opacity: 0.8 }}>v0.1.0 • IndexedDB</div>
            </div>
          </div>

          {/* Right Content Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem 1.6rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem',
              backgroundColor: 'var(--bg-app)',
            }}
          >
            {/* ---------------- Tab 1: Appearance & Themes ---------------- */}
            {activeTab === 'appearance' && (
              <div>
                <div style={{ marginBottom: '1.1rem' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Application UI Theme
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Switch the visual style across all navigation bars, sidebars, cards, modals, and workspace chrome.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
                  {UI_THEMES.map(theme => {
                    const isSelected = uiTheme === theme.id;

                    return (
                      <div
                        key={theme.id}
                        onClick={() => setUiTheme(theme.id)}
                        style={{
                          borderRadius: '12px',
                          border: isSelected
                            ? '2px solid var(--accent-primary)'
                            : '1px solid var(--border-medium)',
                          backgroundColor: 'var(--bg-surface)',
                          boxShadow: isSelected ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                          cursor: 'pointer',
                          padding: '0.9rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          position: 'relative',
                        }}
                      >
                        {/* Preview Mockup Card */}
                        <div
                          style={{
                            height: '105px',
                            borderRadius: '8px',
                            backgroundColor: theme.bgPreview,
                            border: `1px solid ${theme.borderPreview}`,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                          }}
                        >
                          {/* Mini Header */}
                          <div
                            style={{
                              height: '24px',
                              backgroundColor: theme.surfacePreview,
                              borderBottom: `1px solid ${theme.borderPreview}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0 8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: theme.accent }} />
                              <div style={{ width: 34, height: 5, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.6 }} />
                            </div>
                            <div style={{ display: 'flex', gap: '3px' }}>
                              <div style={{ width: 14, height: 6, borderRadius: 2, backgroundColor: theme.accent }} />
                              <div style={{ width: 14, height: 6, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.2 }} />
                            </div>
                          </div>

                          {/* Mini Workspace */}
                          <div style={{ flex: 1, display: 'flex', padding: '6px', gap: '6px' }}>
                            {/* Mini Sidebar */}
                            <div style={{ width: '38px', borderRadius: '4px', backgroundColor: theme.surfacePreview, border: `1px solid ${theme.borderPreview}`, padding: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: theme.accent, opacity: 0.8 }} />
                              <div style={{ width: '75%', height: 4, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.2 }} />
                              <div style={{ width: '60%', height: 4, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.2 }} />
                            </div>
                            {/* Mini Page */}
                            <div style={{ flex: 1, borderRadius: '4px', backgroundColor: theme.surfacePreview, border: `1px solid ${theme.borderPreview}`, padding: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ width: '40%', height: 5, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.8 }} />
                              <div style={{ width: '90%', height: 4, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.3 }} />
                              <div style={{ width: '80%', height: 4, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.3 }} />
                              <div style={{ width: '85%', height: 4, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.3 }} />
                            </div>
                          </div>
                        </div>

                        {/* Title & Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {theme.id === 'modernx-dark' ? (
                              <Moon size={15} color="#8b5cf6" />
                            ) : theme.id === 'modernx-light' ? (
                              <Sun size={15} color="#f59e0b" />
                            ) : (
                              <Sparkles size={15} color="#06b6d4" />
                            )}
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                              {theme.name}
                            </span>
                          </div>

                          {isSelected && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: 'rgba(124, 58, 237, 0.12)',
                                color: 'var(--accent-primary)',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                              }}
                            >
                              <Check size={11} /> Active
                            </span>
                          )}
                        </div>

                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {theme.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Information Note */}
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Sparkles size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Independent Workspace Paper Tones:</strong> When reading or writing, you can also independently choose your favorite paper tone (Sepia, Light, Night, Forest, Cyberpunk) via the <em>Read</em> or <em>Write</em> views.
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- Tab 2: Cloud Storage (WebDAV - Tauri App Only) ---------------- */}
            {activeTab === 'cloud' && isDesktop && (
              <div>
                <div style={{ marginBottom: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      WebDAV Cloud Storage Configuration
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Sync manuscripts seamlessly with Nextcloud, ownCloud, Fastmail, or any standard WebDAV cloud server.
                    </p>
                  </div>
                  {isWebDavConnected && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleDisconnectCloud}
                      style={{ color: 'var(--accent-danger)', gap: '4px', fontSize: '0.78rem' }}
                      title="Remove WebDAV configuration"
                    >
                      <Trash2 size={13} />
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>

                {/* Connection Status Badge */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: isWebDavConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    border: `1px solid ${isWebDavConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.2rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        backgroundColor: isWebDavConnected ? '#10b981' : '#f59e0b',
                        boxShadow: `0 0 8px ${isWebDavConnected ? '#10b981' : '#f59e0b'}`,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem', color: isWebDavConnected ? '#10b981' : '#d97706' }}>
                        {isWebDavConnected ? 'WebDAV Cloud Connected & Synchronized' : 'WebDAV Not Configured'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {isWebDavConnected && webdavConfig
                          ? `${webdavConfig.serverUrl} (${webdavConfig.remotePath || '/'})`
                          : 'Enter your server details below and click Save.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuration Form */}
                <form onSubmit={handleSaveCloudConfig} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                      <Server size={13} color="var(--accent-primary)" />
                      <span>WebDAV Server Endpoint URL:</span>
                    </label>
                    <input
                      type="url"
                      className="form-input"
                      value={serverUrl}
                      onChange={e => setServerUrl(e.target.value)}
                      placeholder="https://cloud.example.com/remote.php/dav/files/username/"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <User size={13} color="var(--accent-primary)" />
                        <span>Username:</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="your-username"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <KeyRound size={13} color="var(--accent-primary)" />
                        <span>Password or App Token:</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="form-input"
                          style={{ paddingRight: '2.4rem' }}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••••••••••"
                        />
                        <button
                          type="button"
                          className="btn-icon btn-sm"
                          style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', opacity: 0.7 }}
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                      <FolderTree size={13} color="var(--accent-primary)" />
                      <span>Remote Folder Path:</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={remotePath}
                      onChange={e => setRemotePath(e.target.value)}
                      placeholder="/Chronicle/"
                    />
                  </div>

                  {/* Test Result Message */}
                  {testResult && (
                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        fontSize: '0.78rem',
                        color: testResult.success ? '#10b981' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      {testResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowCloudHelp(!showCloudHelp)}
                      style={{ gap: '4px', fontSize: '0.76rem' }}
                    >
                      <HelpCircle size={13} />
                      <span>{showCloudHelp ? 'Hide Setup Tips' : 'Provider Tips (Nextcloud, etc.)'}</span>
                    </button>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleTestCloudConnection}
                        disabled={isTesting || !serverUrl.trim()}
                      >
                        {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Server size={13} />}
                        <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                      </button>

                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={isSavingCloud || !serverUrl.trim()}
                      >
                        {isSavingCloud ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        <span>Save Cloud Settings</span>
                      </button>
                    </div>
                  </div>

                  {/* Setup Help Collapse */}
                  {showCloudHelp && (
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.76rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                        Endpoint URL Cheat Sheet:
                      </div>
                      <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                        <li><strong>Nextcloud / ownCloud:</strong> <code>https://your-cloud.com/remote.php/dav/files/YOUR_USERNAME/</code></li>
                        <li><strong>Fastmail WebDAV:</strong> <code>https://myfiles.fastmail.com/</code></li>
                        <li><strong>Infomaniak kDrive:</strong> <code>https://kdrive.infomaniak.com/kdrive/YOUR_DRIVE_ID/</code></li>
                      </ul>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* ---------------- Tab 3: Editor & Reading Defaults ---------------- */}
            {activeTab === 'editor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Reading & Writing Preferences
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Set default typography, page width, and reading tone across the studio.
                  </p>
                </div>

                {/* Default Reading Tone */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Default Reading Paper Tone:</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                    {(['light', 'sepia', 'dark', 'obsidian'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`btn btn-sm ${readerTheme === t ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setReaderTheme(t)}
                        style={{ textTransform: 'capitalize', fontSize: '0.78rem' }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Font Family */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Default Reader Font Family:</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                    {(['serif', 'sans', 'literata', 'opendyslexic', 'mono'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        className={`btn btn-sm ${readerFont === f ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setReaderFont(f)}
                        style={{ textTransform: 'capitalize', fontSize: '0.78rem' }}
                      >
                        {f === 'serif' ? 'Serif (Merriweather)' : f === 'sans' ? 'Sans (Inter)' : f === 'literata' ? 'Literata' : f === 'opendyslexic' ? 'OpenDyslexic' : 'Monospace'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Width Slider */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                      Editor / Reader Margin Width:
                    </label>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {readerMarginWidth}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={560}
                    max={1080}
                    step={20}
                    value={readerMarginWidth}
                    onChange={e => setReaderMarginWidth(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>Narrow (560px)</span>
                    <span>Standard (760px)</span>
                    <span>Widescreen (1080px)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- Tab 4: General & Storage ---------------- */}
            {activeTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    General & Local Storage Diagnostics
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    System startup preferences and browser database status.
                  </p>
                </div>

                {/* Startup Welcome Guide Toggle */}
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      Show Welcome Guide on Startup
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Presents the introductory feature overview and quick-open actions when Chronicle boots.
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={showWelcomeOnStartup}
                    onChange={e => handleToggleWelcome(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                </div>

                {/* IndexedDB Status Card */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    <Database size={16} color="var(--accent-primary)" />
                    <span>IndexedDB Persistence Engine</span>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Chronicle uses a local browser IndexedDB database (<code>chronicle_app_settings_db</code>) to preserve:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    <div>✓ Active UI Theme (ModernX / Glass)</div>
                    {isDesktop && <div>✓ WebDAV Cloud Sync Credentials</div>}
                    <div>✓ Startup Guide Preference</div>
                    <div>✓ Reader & Writer Layout Defaults</div>
                  </div>
                </div>

                {/* Essential Shortcuts Reference */}
                <div
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                    <Keyboard size={15} color="var(--accent-primary)" />
                    <span>Global Desktop Keybindings</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>Settings & Preferences</span>
                      <kbd className="kbd-shortcut">Ctrl+,</kbd>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>{isDesktop ? 'Quick Save (Local / Cloud)' : 'Quick Save (Project File)'}</span>
                      <kbd className="kbd-shortcut">Ctrl+S</kbd>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>Open File / Manuscript</span>
                      <kbd className="kbd-shortcut">Ctrl+O</kbd>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>Toggle Chapters Sidebar</span>
                      <kbd className="kbd-shortcut">Ctrl+\</kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
