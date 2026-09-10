import React from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { Cloud, Monitor, X, ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react';

interface CloudDesktopNoticeModalProps {
  onClose: () => void;
}

export const CloudDesktopNoticeModal: React.FC<CloudDesktopNoticeModalProps> = ({ onClose }) => {
  useEscapeKey(onClose);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 260 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '560px',
          width: '92%',
          background: 'linear-gradient(175deg, #191924 0%, #121218 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '18px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(59, 130, 246, 0.15)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-desktop-notice-title"
      >
        {/* Header */}
        <div
          style={{
            padding: '1.75rem 1.5rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            background: 'radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 65%)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
              flexShrink: 0,
              boxShadow: '0 0 16px rgba(59, 130, 246, 0.25)',
            }}
          >
            <Cloud size={24} />
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#60a5fa',
                background: 'rgba(59, 130, 246, 0.12)',
                padding: '0.18rem 0.55rem',
                borderRadius: '9999px',
                marginBottom: '0.45rem',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <Monitor size={12} />
              <span>Desktop App Exclusive</span>
            </div>
            <h3
              id="cloud-desktop-notice-title"
              style={{
                margin: 0,
                fontSize: '1.2rem',
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Cloud Storage Requires Desktop App
            </h3>
            <p
              style={{
                margin: '0.35rem 0 0',
                fontSize: '0.83rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
              }}
            >
              WebDAV cloud sync is available exclusively in the native desktop version of Chronicle.
            </p>
          </div>

          <button
            className="btn-icon btn-sm"
            onClick={onClose}
            title="Close (Esc)"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.4rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div
            style={{
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              padding: '0.9rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            Standard web browsers enforce strict <strong>Cross-Origin Resource Sharing (CORS)</strong> restrictions that block web pages from directly executing WebDAV protocol commands (<kbd>PROPFIND</kbd>, <kbd>MKCOL</kbd>, <kbd>PUT</kbd>) to personal or remote cloud servers (such as Nextcloud, ownCloud, or Synology).
          </div>

          {/* Feature Highlights on Desktop */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Unlocked in the Desktop App
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '9px',
                }}
              >
                <div style={{ color: '#34d399', marginTop: '2px' }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    100% CORS-Free WebDAV Connectivity
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '2px' }}>
                    Direct OS-level native HTTP requests bypass browser security restrictions without server reverse proxies.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '9px',
                }}
              >
                <div style={{ color: '#60a5fa', marginTop: '2px' }}>
                  <RefreshCw size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Automatic Cloud Overwrite & Bidirectional Save As
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '2px' }}>
                    Pressing <kbd>Ctrl+S</kbd> uploads and replaces the file directly on your cloud, keeping manuscripts synchronized.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            background: 'rgba(14, 14, 20, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <button
            className="btn btn-primary btn-sm"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem' }}
          >
            <span>Understood</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
