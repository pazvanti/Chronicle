import React, { useState, useEffect } from 'react';
import { useEpub } from '../../context/EpubContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { UI_THEMES } from '../../types/theme';
import { testConnection, isTauri } from '../../services/cloud/webdavClient';
import { WebDavConfig } from '../../types/cloud';
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
  Feather,
  Layout,
  Focus,
  MoveVertical,
  MessageSquareOff,
  ArrowUpCircle,
  DownloadCloud,
  ExternalLink,
  RefreshCw,
  Save,
  Globe,
} from 'lucide-react';
import { ChronicleLogo } from '../Common/ChronicleLogo';
import { markdownToHtml } from '../../services/epub/markdownImporter';
import {
  CURRENT_VERSION,
  GUMROAD_DOWNLOAD_URL,
  UpdateCheckResult,
} from '../../services/update/updateChecker';
import { useTranslation } from '../../i18n/I18nContext';

export type SettingsTab = 'appearance' | 'themes' | 'cloud' | 'editor' | 'general' | 'updates';

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
    minimalistMode,
    setMinimalistMode,
    isZenMode,
    toggleZenMode,
    zenSettings,
    updateZenSettings,
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
    setIsWelcomeModalOpen,
    checkUpdatesOnStartup,
    setCheckUpdatesOnStartup,
    isUpdateAvailable,
    latestRelease,
    checkForUpdatesManually,
    showWelcomeOnStartup,
    setShowWelcomeOnStartup,
    autoSaveEnabled,
    setAutoSaveEnabled,
    autoSaveInterval,
    setAutoSaveInterval,
  } = useEpub();

  const { t, language, setLanguage } = useTranslation();

  useEscapeKey(onClose);

  const isDesktop = isTauri();
  const effectiveInitialTab = (!isDesktop && initialTab === 'cloud') ? 'appearance' : initialTab;
  const [activeTab, setActiveTab] = useState<SettingsTab>(effectiveInitialTab);
  const [appVersion, setAppVersion] = useState<string>(CURRENT_VERSION);

  useEffect(() => {
    setActiveTab(effectiveInitialTab);
  }, [effectiveInitialTab]);

  useEffect(() => {
    if (isTauri()) {
      import('@tauri-apps/api/app')
        .then(({ getVersion }) => {
          getVersion()
            .then(v => {
              if (v) setAppVersion(v);
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  // Updates checking state
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(latestRelease);

  useEffect(() => {
    if (latestRelease) {
      setUpdateResult(latestRelease);
    }
  }, [latestRelease]);

  const handleCheckUpdatesManual = async () => {
    setIsCheckingUpdates(true);
    try {
      const res = await checkForUpdatesManually(true);
      setUpdateResult(res);
      if (res.hasUpdate) {
        showNotification('success', t('notifications.newVersionAvailable', { version: res.latestVersion }));
      } else if (res.error) {
        showNotification('error', `Update check failed: ${res.error}`);
      } else {
        showNotification('info', t('notifications.chronicleUpToDate', { version: res.currentVersion }));
      }
    } catch (err: any) {
      showNotification('error', `Failed to check for updates: ${err?.message || 'Error'}`);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleToggleCheckUpdates = async (checked: boolean) => {
    await setCheckUpdatesOnStartup(checked);
    showNotification('info', checked ? t('notifications.checkUpdatesEnabled') : t('notifications.checkUpdatesDisabled'));
  };

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

  // Initialize WebDAV states
  useEffect(() => {
    if (webdavConfig) {
      setServerUrl(webdavConfig.serverUrl || '');
      setUsername(webdavConfig.username || '');
      setPassword(webdavConfig.password || '');
      setRemotePath(webdavConfig.remotePath || '/Chronicle/');
    }
  }, [webdavConfig]);

  const handleToggleWelcome = async (checked: boolean) => {
    await setShowWelcomeOnStartup(checked);
    showNotification('info', checked ? t('notifications.welcomeGuideEnabled') : t('notifications.welcomeGuideDisabled'));
  };

  const handleToggleAutoSave = async (checked: boolean) => {
    await setAutoSaveEnabled(checked);
    showNotification('info', checked ? t('notifications.autoSaveEnabledNotify') : t('notifications.autoSaveDisabledNotify'));
  };

  const handleChangeAutoSaveInterval = async (val: number) => {
    await setAutoSaveInterval(val);
    const labelKey = val === 30 ? 'interval30s' : val === 60 ? 'interval1m' : val === 120 ? 'interval2m' : 'interval5m';
    const label = t(`settings.${labelKey}` as any);
    showNotification('info', t('notifications.autoSaveIntervalUpdated', { interval: label }));
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

  const allNavTabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    { id: 'appearance', label: t('settings.tabAppearance'), icon: <Layout size={16} /> },
    { id: 'themes', label: t('settings.tabThemes'), icon: <Palette size={16} /> },
    {
      id: 'cloud',
      label: t('settings.tabCloud'),
      icon: <Cloud size={16} />,
      badge: isWebDavConnected ? 'Active' : undefined,
    },
    { id: 'editor', label: t('settings.tabEditor'), icon: <Sliders size={16} /> },
    { id: 'general', label: t('settings.tabGeneral'), icon: <Database size={16} /> },
    {
      id: 'updates',
      label: t('settings.tabUpdates'),
      icon: <ArrowUpCircle size={16} />,
      badge: isUpdateAvailable ? (latestRelease?.latestVersion || 'New') : undefined,
      badgeColor: isUpdateAvailable ? '#e6be75' : undefined,
    },
  ];

  const navTabs = isDesktop ? allNavTabs : allNavTabs.filter(tab => tab.id !== 'cloud');

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 280 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '1060px',
          width: '94vw',
          height: 'min(760px, 88vh)',
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
        <div className="modal-header" style={{ padding: '1.1rem 1.6rem' }}>
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
                {t('settings.modalTitle')}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {t('settings.generalDesc')}
              </p>
            </div>
          </div>
          <button className="btn-icon btn-sm" onClick={onClose} title={t('common.close')}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body: Sidebar + Main Workspace */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left Navigation Sidebar */}
          <div
            style={{
              width: '200px',
              borderRight: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              padding: '0.75rem 0.5rem',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {navTabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      fontSize: '0.82rem',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      justifyContent: 'flex-start',
                      fontWeight: isActive ? 600 : 400,
                      background: isActive ? 'var(--accent-primary-glow)' : 'transparent',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      border: 'none',
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          backgroundColor: tab.badgeColor ? 'rgba(230, 190, 117, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                          color: tab.badgeColor || '#10b981',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          border: tab.badgeColor ? '1px solid rgba(230, 190, 117, 0.35)' : 'none',
                        }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions: Guide Shortcut & App Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  setIsWelcomeModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  fontSize: '0.78rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  justifyContent: 'flex-start',
                  width: '100%',
                }}
                title={t('settings.welcomeGuide')}
              >
                <Sparkles size={15} style={{ color: '#c084fc' }} />
                <span>{t('settings.welcomeGuide')}</span>
              </button>

              <div style={{ padding: '0 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div>Chronicle Studio</div>
                  <div style={{ opacity: 0.8 }}>v{appVersion}</div>
                </div>
                {isUpdateAvailable && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('updates')}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(230, 190, 117, 0.4)',
                      background: 'rgba(230, 190, 117, 0.15)',
                      color: 'var(--gold-primary)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="View new update details"
                  >
                    Update
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.3rem',
              backgroundColor: 'var(--bg-app)',
            }}
          >
            {/* ---------------- Tab 1: Appearance ---------------- */}
            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                {/* 1. Workspace Interface Mode Switcher */}
                <div>
                  <div style={{ marginBottom: '0.85rem' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t('settings.workspaceInterfaceMode')}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {t('settings.workspaceInterfaceDesc')}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
                    {/* Option 1: Studio Mode */}
                    <div
                      onClick={() => setMinimalistMode(false)}
                      style={{
                        borderRadius: '12px',
                        border: !minimalistMode
                          ? '2px solid var(--accent-primary)'
                          : '1px solid var(--border-medium)',
                        backgroundColor: !minimalistMode ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        boxShadow: !minimalistMode ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                        cursor: 'pointer',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '8px',
                              backgroundColor: !minimalistMode ? 'var(--accent-primary-glow)' : 'var(--bg-surface-hover)',
                              color: !minimalistMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Layout size={17} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              {t('settings.studioModeTitle')}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {t('settings.studioModeSubtitle')}
                            </div>
                          </div>
                        </div>

                        {!minimalistMode && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(124, 58, 237, 0.14)',
                              color: 'var(--accent-primary)',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                            }}
                          >
                            <Check size={11} /> {t('settings.activeBadge')}
                          </span>
                        )}
                      </div>

                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {t('settings.studioModeDesc')}
                      </p>
                    </div>

                    {/* Option 2: Minimalist Mode */}
                    <div
                      onClick={() => setMinimalistMode(true)}
                      style={{
                        borderRadius: '12px',
                        border: minimalistMode
                          ? '2px solid var(--accent-primary)'
                          : '1px solid var(--border-medium)',
                        backgroundColor: minimalistMode ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        boxShadow: minimalistMode ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                        cursor: 'pointer',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '8px',
                              backgroundColor: minimalistMode ? 'var(--accent-primary-glow)' : 'var(--bg-surface-hover)',
                              color: minimalistMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Feather size={17} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              {t('settings.minimalistModeTitle')}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {t('settings.minimalistModeSubtitle')}
                            </div>
                          </div>
                        </div>

                        {minimalistMode && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(124, 58, 237, 0.14)',
                              color: 'var(--accent-primary)',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                            }}
                          >
                            <Check size={11} /> {t('settings.activeBadge')}
                          </span>
                        )}
                      </div>

                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {t('settings.minimalistModeDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Zen Mode (Distraction-Free Immersion) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t('settings.zenModeTitle')}
                        </h4>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: isZenMode ? 'rgba(124, 58, 237, 0.2)' : 'var(--bg-surface-elevated)',
                            color: isZenMode ? 'var(--accent-primary)' : 'var(--text-muted)',
                            border: `1px solid ${isZenMode ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          {isZenMode ? t('settings.zenModeActive') : t('settings.zenModeInactive')}
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {t('settings.zenModeDesc')}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`btn btn-sm ${isZenMode ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={toggleZenMode}
                      style={{ fontSize: '0.78rem', gap: '5px' }}
                    >
                      <Focus size={14} />
                      <span>{isZenMode ? t('settings.exitZenBtn') : t('settings.enterZenBtn')}</span>
                    </button>
                  </div>

                  {/* Auto-Switch On Typing Toggle */}
                  <div
                    style={{
                      padding: '0.85rem 1.1rem',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        {t('settings.switchZenOnTyping')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t('settings.switchZenOnTypingDesc')}
                      </div>
                    </div>
                    <label className="toggle-switch" style={{ margin: 0, flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={zenSettings.autoSwitchOnTyping}
                        onChange={e => updateZenSettings({ autoSwitchOnTyping: e.target.checked })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* The 4 Core Zen Mechanics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                    {/* Mechanic 1: Typewriter Scrolling */}
                    <div
                      onClick={() => updateZenSettings({ typewriterScrolling: !zenSettings.typewriterScrolling })}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        backgroundColor: zenSettings.typewriterScrolling ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        border: zenSettings.typewriterScrolling ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          <MoveVertical size={16} color="var(--accent-primary)" />
                          {t('settings.typewriterScrolling')}
                        </div>
                        <input
                          type="checkbox"
                          checked={zenSettings.typewriterScrolling}
                          onChange={e => e.stopPropagation()}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                      </div>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {t('settings.typewriterScrollingDesc')}
                      </p>
                    </div>

                    {/* Mechanic 2: Focus Dimming */}
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        backgroundColor: zenSettings.focusDimming ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        border: zenSettings.focusDimming ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div
                        onClick={() => updateZenSettings({ focusDimming: !zenSettings.focusDimming })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          <Focus size={16} color="var(--accent-primary)" />
                          {t('settings.focusDimming')}
                        </div>
                        <input
                          type="checkbox"
                          checked={zenSettings.focusDimming}
                          onChange={e => {
                            e.stopPropagation();
                            updateZenSettings({ focusDimming: e.target.checked });
                          }}
                          style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                        />
                      </div>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {t('settings.focusDimmingDesc')}
                      </p>

                      {/* Dimming Visibility Slider */}
                      {zenSettings.focusDimming && (
                        <div
                          style={{
                            marginTop: '0.75rem',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                margin: 0,
                                cursor: 'default',
                              }}
                            >
                              Dimmed Visibility:
                            </label>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                              {zenSettings.focusDimOpacity ?? 35}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={85}
                            step={5}
                            value={zenSettings.focusDimOpacity ?? 35}
                            onChange={e => updateZenSettings({ focusDimOpacity: Number(e.target.value) })}
                            style={{
                              width: '100%',
                              accentColor: 'var(--accent-primary)',
                              cursor: 'pointer',
                            }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            <span>High Focus (10%)</span>
                            <span>Default (35%)</span>
                            <span>Subtle (85%)</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mechanic 3: Ghost HUD (Zero UI) */}
                    <div
                      onClick={() => updateZenSettings({ ghostHud: !zenSettings.ghostHud })}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        backgroundColor: zenSettings.ghostHud ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        border: zenSettings.ghostHud ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          <EyeOff size={16} color="var(--accent-primary)" />
                          {t('settings.ghostHud')}
                        </div>
                        <input
                          type="checkbox"
                          checked={zenSettings.ghostHud}
                          onChange={e => e.stopPropagation()}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                      </div>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {t('settings.ghostHudDesc')}
                      </p>
                    </div>

                    {/* Mechanic 4: Hide Comments & Highlights */}
                    <div
                      onClick={() => updateZenSettings({ hideComments: !zenSettings.hideComments })}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        backgroundColor: zenSettings.hideComments ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        border: zenSettings.hideComments ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          <MessageSquareOff size={16} color="var(--accent-primary)" />
                          {t('settings.hideComments')}
                        </div>
                        <input
                          type="checkbox"
                          checked={zenSettings.hideComments}
                          onChange={e => e.stopPropagation()}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                      </div>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {t('settings.hideCommentsDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Focus Shortcuts Reference Footer */}
                <div
                  style={{
                    padding: '0.85rem 1.1rem',
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
                  <Keyboard size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                  <div>
                    {t('settings.focusShortcutsFooter')}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- Tab 2: Themes ---------------- */}
            {activeTab === 'themes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t('settings.appUiThemes')}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {t('settings.appUiThemesDesc')}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(124, 58, 237, 0.12)',
                      color: 'var(--accent-primary)',
                      border: '1px solid rgba(124, 58, 237, 0.25)',
                      flexShrink: 0,
                    }}
                  >
                    {t('settings.activeBadge')}: {UI_THEMES.find(t => t.id === uiTheme)?.name || 'Classic - Dark'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
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
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          position: 'relative',
                        }}
                      >
                        {/* Preview Mockup Card */}
                        <div
                          style={{
                            height: '115px',
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
                              height: '26px',
                              backgroundColor: theme.surfacePreview,
                              borderBottom: `1px solid ${theme.borderPreview}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0 10px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: theme.accent }} />
                              <div style={{ width: 40, height: 5, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.6 }} />
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <div style={{ width: 16, height: 6, borderRadius: 2, backgroundColor: theme.accent }} />
                              <div style={{ width: 16, height: 6, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.2 }} />
                            </div>
                          </div>

                          {/* Mini Workspace */}
                          <div style={{ flex: 1, display: 'flex', padding: '8px', gap: '8px' }}>
                            {/* Mini Sidebar */}
                            <div style={{ width: '44px', borderRadius: '4px', backgroundColor: theme.surfacePreview, border: `1px solid ${theme.borderPreview}`, padding: '5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ width: '100%', height: 5, borderRadius: 2, backgroundColor: theme.accent, opacity: 0.8 }} />
                              <div style={{ width: '75%', height: 4, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.25 }} />
                              <div style={{ width: '60%', height: 4, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.25 }} />
                            </div>
                            {/* Mini Page */}
                            <div style={{ flex: 1, borderRadius: '4px', backgroundColor: theme.surfacePreview, border: `1px solid ${theme.borderPreview}`, padding: '7px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ width: '45%', height: 6, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.8 }} />
                              <div style={{ width: '92%', height: 4, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.3 }} />
                              <div style={{ width: '82%', height: 4, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.3 }} />
                              <div style={{ width: '88%', height: 4, borderRadius: 2, backgroundColor: theme.textColor, opacity: 0.3 }} />
                            </div>
                          </div>
                        </div>

                        {/* Title & Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {theme.id.includes('dark') ? (
                              <Moon size={16} color={theme.accent} />
                            ) : (
                              <Sun size={16} color={theme.accent} />
                            )}
                            <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
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
                              <Check size={11} /> {t('settings.activeBadge')}
                            </span>
                          )}
                        </div>

                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                          {theme.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Manuscript Canvas Paper Tone Integration */}
                <div
                  style={{
                    padding: '1.15rem 1.3rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {t('settings.defaultPaperTone')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t('settings.defaultPaperToneDesc')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(['light', 'sepia', 'dark', 'obsidian'] as const).map(itemTheme => {
                        const isToneActive = readerTheme === itemTheme;
                        return (
                          <button
                            key={itemTheme}
                            type="button"
                            className={`btn btn-sm ${isToneActive ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setReaderTheme(itemTheme)}
                            style={{
                              textTransform: 'capitalize',
                              fontSize: '0.8rem',
                              padding: '0.35rem 0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                backgroundColor:
                                  itemTheme === 'light'
                                    ? '#f8fafc'
                                    : itemTheme === 'sepia'
                                      ? '#fbf0d9'
                                      : itemTheme === 'dark'
                                        ? '#1e293b'
                                        : '#09090b',
                                border: '1px solid rgba(128,128,128,0.4)',
                              }}
                            />
                            {itemTheme}
                            {isToneActive && <Check size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Information Callout */}
                <div
                  style={{
                    padding: '0.95rem 1.1rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  <Sparkles size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                  <div>
                    {t('settings.chromeVsPaperCallout')}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- Tab 3: Cloud Storage (WebDAV - Tauri App Only) ---------------- */}
            {activeTab === 'cloud' && isDesktop && (
              <div>
                <div style={{ marginBottom: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t('settings.webdavCloudConfig')}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {t('settings.webdavCloudDesc')}
                    </p>
                  </div>
                  {isWebDavConnected && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleDisconnectCloud}
                      style={{ color: 'var(--accent-danger)', gap: '4px', fontSize: '0.78rem' }}
                      title={t('settings.disconnect')}
                    >
                      <Trash2 size={13} />
                      <span>{t('settings.disconnect')}</span>
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
                        {isWebDavConnected ? t('settings.connectedStatus') : t('settings.notConfiguredStatus')}
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
                      <span>{t('settings.serverUrlLabel')}</span>
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
                        <span>{t('settings.usernameLabel')}</span>
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
                        <span>{t('settings.passwordLabel')}</span>
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
                      <span>{t('settings.remotePathLabel')}</span>
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
                      <span>{showCloudHelp ? t('settings.hideSetupTips') : t('settings.providerTips')}</span>
                    </button>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleTestCloudConnection}
                        disabled={isTesting || !serverUrl.trim()}
                      >
                        {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Server size={13} />}
                        <span>{isTesting ? t('settings.testing') : t('settings.testConnection')}</span>
                      </button>

                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={isSavingCloud || !serverUrl.trim()}
                      >
                        {isSavingCloud ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        <span>{t('settings.saveCloudSettings')}</span>
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
                        {t('settings.cheatSheetTitle')}
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

            {/* ---------------- Tab 4: Editor & Reading Defaults ---------------- */}
            {activeTab === 'editor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t('settings.readingWritingPrefs')}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {t('settings.readingWritingDesc')}
                  </p>
                </div>

                {/* Default Reading Tone */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>{t('settings.paperTone')}</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                    {(['light', 'sepia', 'dark', 'obsidian'] as const).map(itemTone => (
                      <button
                        key={itemTone}
                        type="button"
                        className={`btn btn-sm ${readerTheme === itemTone ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setReaderTheme(itemTone)}
                        style={{ textTransform: 'capitalize', fontSize: '0.78rem' }}
                      >
                        {itemTone}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Font Family */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>{t('settings.fontFamily')}</label>
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
                      {t('settings.marginWidth')}
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
                    <span>{t('settings.marginNarrow')}</span>
                    <span>{t('settings.marginStandard')}</span>
                    <span>{t('settings.marginWide')}</span>
                  </div>
                </div>

                {/* Auto-save Preferences Card */}
                <div
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Save size={15} style={{ color: 'var(--accent-primary)' }} />
                        <span>{t('settings.autoSaveTitle')}</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t('settings.autoSaveDesc')}
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={autoSaveEnabled}
                        onChange={e => handleToggleAutoSave(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                    </label>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.6rem',
                      borderTop: '1px solid var(--border-subtle)',
                      opacity: autoSaveEnabled ? 1 : 0.5,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    <div>
                      <label
                        htmlFor="auto-save-interval"
                        style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}
                      >
                        {t('settings.autoSaveInterval')}
                      </label>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {t('settings.autoSaveIntervalDesc')}
                      </div>
                    </div>

                    <select
                      id="auto-save-interval"
                      className="form-select"
                      value={autoSaveInterval}
                      disabled={!autoSaveEnabled}
                      onChange={e => handleChangeAutoSaveInterval(Number(e.target.value))}
                      style={{
                        width: '180px',
                        fontSize: '0.8rem',
                        padding: '0.35rem 0.6rem',
                        cursor: autoSaveEnabled ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <option value={30}>{t('settings.interval30s')}</option>
                      <option value={60}>{t('settings.interval1m')}</option>
                      <option value={120}>{t('settings.interval2m')}</option>
                      <option value={300}>{t('settings.interval5m')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- Tab 5: General & Storage ---------------- */}
            {activeTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t('settings.generalDiagnostics')}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {t('settings.generalDesc')}
                  </p>
                </div>

                {/* Interface Language Selector Card */}
                <div
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Globe size={15} style={{ color: 'var(--accent-primary)' }} />
                        <span>{t('settings.languageTitle')}</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t('settings.languageDesc')}
                      </div>
                    </div>

                    <select
                      className="form-select"
                      value={language}
                      onChange={e => {
                        const newLang = e.target.value as 'en' | 'pt-BR';
                        setLanguage(newLang);
                        const langLabel =
                          newLang === 'pt-BR'
                            ? t('settings.portuguese')
                            : t('settings.english');
                        showNotification('info', t('notifications.languageChanged', { lang: langLabel }));
                      }}
                      style={{
                        width: '180px',
                        fontSize: '0.8rem',
                        padding: '0.35rem 0.6rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="en">{t('settings.english')}</option>
                      <option value="pt-BR">{t('settings.portuguese')}</option>
                    </select>
                  </div>
                </div>

                {/* User & Welcome Guide Launch Card */}
                <div
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={15} style={{ color: '#c084fc' }} />
                      <span>{t('settings.welcomeGuide')}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {t('settings.welcomeGuideDesc')}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      onClose();
                      setIsWelcomeModalOpen(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    <Sparkles size={13} style={{ color: '#c084fc' }} />
                    <span>{t('settings.openGuide')}</span>
                  </button>
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
                      {t('settings.showWelcomeStartup')}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {t('settings.showWelcomeStartupDesc')}
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
                    <span>{t('settings.dbPersistence')}</span>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {t('settings.dbPersistenceDesc')}
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
                    <span>{t('settings.globalDesktopKeybindings')}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>{t('settings.keySettings')}</span>
                      <kbd className="kbd-shortcut">Ctrl+,</kbd>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>{isDesktop ? t('settings.keyQuickSave') : 'Quick Save (Project File)'}</span>
                      <kbd className="kbd-shortcut">Ctrl+S</kbd>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>{t('settings.keyOpen')}</span>
                      <kbd className="kbd-shortcut">Ctrl+O</kbd>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>{t('settings.keySidebar')}</span>
                      <kbd className="kbd-shortcut">Ctrl+\</kbd>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>{t('settings.keyMinimalist')}</span>
                      <kbd className="kbd-shortcut">Alt+M</kbd>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>{t('settings.keyZen')}</span>
                      <kbd className="kbd-shortcut">Alt+Z</kbd>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-input)' }}>
                      <span>{t('settings.keyExitZen')}</span>
                      <kbd className="kbd-shortcut">Esc</kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: UPDATES & VERSION INFORMATION */}
            {activeTab === 'updates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                {/* Header */}
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
                    Application Updates & Version Information
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Check for the latest Chronicle releases directly from GitHub Releases and download desktop packages.
                  </p>
                </div>

                {/* Current Version & Channel Status Card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.2rem 1.4rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(230, 190, 117, 0.2), rgba(168, 85, 247, 0.2))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-starlight)',
                        color: 'var(--gold-primary)',
                      }}
                    >
                      <ChronicleLogo size={26} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Chronicle Studio
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(230, 190, 117, 0.15)',
                            color: 'var(--gold-primary)',
                            border: '1px solid rgba(230, 190, 117, 0.3)',
                          }}
                        >
                          v{appVersion}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            backgroundColor: 'var(--bg-surface-hover)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {isDesktop ? 'Desktop App' : 'Web Studio'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Open-source AGPL-3.0 authoring suite • 100% Local-first
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCheckUpdatesManual}
                      disabled={isCheckingUpdates}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 1.1rem',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                      }}
                    >
                      <RefreshCw size={15} className={isCheckingUpdates ? 'animate-spin' : ''} />
                      <span>{isCheckingUpdates ? 'Checking GitHub...' : 'Check for Updates'}</span>
                    </button>
                  </div>
                </div>

                {/* Auto-check setting toggle */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.2rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Check for updates automatically on startup
                    </span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Queries GitHub Releases when opening Chronicle and alerts you if a newer version is available
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkUpdatesOnStartup !== false}
                    onChange={e => handleToggleCheckUpdates(e.target.checked)}
                    className="form-checkbox"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {/* Update Check Results Area */}
                {updateResult && (
                  <>
                    {updateResult.hasUpdate ? (
                      /* UPDATE AVAILABLE CARD */
                      <div
                        style={{
                          padding: '1.4rem',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, rgba(230, 190, 117, 0.12), rgba(168, 85, 247, 0.1))',
                          border: '1px solid rgba(230, 190, 117, 0.4)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '8px',
                                backgroundColor: 'rgba(230, 190, 117, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'center',
                                justifyContent: 'center',
                                color: 'var(--gold-primary)',
                              }}
                            >
                              <Sparkles size={18} />
                            </div>
                            <div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {updateResult.releaseName || `New Release ${updateResult.latestVersion}`}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                Latest version: <strong style={{ color: 'var(--gold-primary)' }}>{updateResult.latestVersion}</strong>
                                {updateResult.publishedAt && ` • Released ${new Date(updateResult.publishedAt).toLocaleDateString()}`}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                            <a
                              href={updateResult.gumroadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.5rem 1rem',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                              }}
                            >
                              <DownloadCloud size={15} />
                              <span>Download on Gumroad</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>

                        {/* Release Notes Changelog Container */}
                        {updateResult.releaseNotes && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              padding: '1rem 1.2rem',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(0, 0, 0, 0.25)',
                              border: '1px solid var(--border-subtle)',
                              maxHeight: '260px',
                              overflowY: 'auto',
                            }}
                          >
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gold-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              What's New in {updateResult.latestVersion}
                            </div>
                            <div
                              className="release-notes-content"
                              style={{
                                fontSize: '0.82rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.6,
                              }}
                              dangerouslySetInnerHTML={{ __html: markdownToHtml(updateResult.releaseNotes) }}
                            />
                          </div>
                        )}
                      </div>
                    ) : updateResult.error ? (
                      /* ERROR CARD */
                      <div
                        style={{
                          padding: '1rem 1.2rem',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          color: '#ef4444',
                        }}
                      >
                        <AlertCircle size={20} style={{ flexShrink: 0 }} />
                        <div style={{ fontSize: '0.82rem' }}>
                          <strong>Could not check for updates:</strong> {updateResult.error}
                        </div>
                      </div>
                    ) : (
                      /* UP TO DATE CARD */
                      <div
                        style={{
                          padding: '1.2rem 1.4rem',
                          borderRadius: '12px',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <CheckCircle2 size={24} style={{ color: '#10b981', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Chronicle is up to date
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              You are running the latest release ({updateResult.currentVersion}) • Checked {new Date(updateResult.checkedAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        <a
                          href={GUMROAD_DOWNLOAD_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <span>Gumroad Store</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
