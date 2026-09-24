import React from 'react';
import { Smartphone, Monitor, AlertTriangle } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useTranslation } from '../../i18n/I18nContext';

interface MobileNoticeModalProps {
  onDismiss?: () => void;
}

export const MobileNoticeModal: React.FC<MobileNoticeModalProps> = ({ onDismiss }) => {
  const { t } = useTranslation();
  useEscapeKey(onDismiss);

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '540px',
          width: '92%',
          background: 'linear-gradient(175deg, #171722 0%, #0d0e14 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 24px 70px -12px rgba(0, 0, 0, 0.9), 0 0 40px rgba(245, 158, 11, 0.15)',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease-out',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-notice-title"
      >
        {/* Header */}
        <div
          style={{
            padding: '1.75rem 1.5rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'radial-gradient(circle at 10% 20%, rgba(245, 158, 11, 0.15) 0%, transparent 65%)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
              flexShrink: 0,
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)',
            }}
          >
            <Smartphone size={26} />
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.12)',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                marginBottom: '0.5rem',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <AlertTriangle size={12} />
              <span>{t('mobile.noticeTitle')}</span>
            </div>
            <h3
              id="mobile-notice-title"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '-0.02em',
              }}
            >
              {t('mobile.noticeTitle')}
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.92rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            {t('mobile.noticeSubtitle')}
          </p>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1rem 1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              fontSize: '0.85rem',
              color: '#e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Monitor size={16} color="#38bdf8" />
              <span><strong>Designed for Desktop &amp; Tablets</strong> (768px+ width)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Smartphone size={16} color="#f59e0b" />
              <span><strong>Not Optimized for Phones</strong> due to complex multi-panel UI</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1.25rem 1.5rem 1.5rem',
            background: 'rgba(0, 0, 0, 0.25)',
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                fontSize: '0.92rem',
                fontWeight: 600,
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {t('mobile.continueAnyway')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
