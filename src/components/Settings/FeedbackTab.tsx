import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Sparkles,
  AlertCircle,
  Heart,
  Send,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Monitor,
  Mail,
} from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';
import {
  FeedbackCategory,
  getSystemDiagnostics,
  submitFeedback,
} from '../../services/feedback/feedbackService';

interface FeedbackTabProps {
  onNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const FeedbackTab: React.FC<FeedbackTabProps> = ({ onNotification }) => {
  const { t } = useTranslation();

  const [category, setCategory] = useState<FeedbackCategory>('feature');
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<boolean>(false);

  const diagnostics = useMemo(() => getSystemDiagnostics(), []);

  const placeholderText = useMemo(() => {
    switch (category) {
      case 'bug':
        return t('settings.feedbackPlaceholderBug');
      case 'feature':
        return t('settings.feedbackPlaceholderFeature');
      case 'praise':
        return t('settings.feedbackPlaceholderPraise');
      case 'general':
      default:
        return t('settings.feedbackPlaceholderGeneral');
    }
  }, [category, t]);

  const isValid = message.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await submitFeedback({
      category,
      message,
      email: email.trim() || undefined,
      includeDiagnostics,
      diagnostics,
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsSubmitted(true);
      if (onNotification) {
        onNotification('success', t('notifications.feedbackSentSuccess'));
      }
    } else {
      setErrorMessage(result.error || t('settings.feedbackErrorMessage'));
      if (onNotification) {
        onNotification('error', t('notifications.feedbackSentError'));
      }
    }
  };

  const handleReset = () => {
    setMessage('');
    setEmail('');
    setIsSubmitted(false);
    setErrorMessage(null);
    setTouched(false);
  };

  const categories: { id: FeedbackCategory; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'feature',
      label: t('settings.feedbackCategoryFeature'),
      icon: <Sparkles size={14} />,
      color: 'var(--accent-primary)',
    },
    {
      id: 'bug',
      label: t('settings.feedbackCategoryBug'),
      icon: <AlertCircle size={14} />,
      color: '#ef4444',
    },
    {
      id: 'general',
      label: t('settings.feedbackCategoryGeneral'),
      icon: <MessageSquare size={14} />,
      color: '#3b82f6',
    },
    {
      id: 'praise',
      label: t('settings.feedbackCategoryPraise'),
      icon: <Heart size={14} />,
      color: '#f43f5e',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
      {/* Header with Title and Privacy Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: '0 0 0.35rem 0',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
            }}
          >
            <span>{t('settings.feedbackTitle')}</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={11} />
              <span>{t('settings.feedbackBadge')}</span>
            </span>
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {t('settings.feedbackDesc')}
          </p>
        </div>
      </div>

      {isSubmitted ? (
        /* Success State Card */
        <div
          style={{
            padding: '2.5rem 1.8rem',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <div>
            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('settings.feedbackSuccessTitle')}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '0.88rem',
                color: 'var(--text-muted)',
                maxWidth: '480px',
                lineHeight: 1.55,
              }}
            >
              {t('settings.feedbackSuccessDesc')}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleReset}
            style={{
              marginTop: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.82rem',
              padding: '0.5rem 1rem',
            }}
          >
            <RotateCcw size={14} />
            <span>{t('settings.feedbackSendAnother')}</span>
          </button>
        </div>
      ) : (
        /* Feedback Submission Form */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMessage && (
            <div
              style={{
                padding: '0.85rem 1.1rem',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                color: '#ef4444',
                fontSize: '0.82rem',
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>{t('settings.feedbackErrorTitle')}:</strong> {errorMessage}
              </div>
            </div>
          )}

          {/* Category Selector Pills */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
              }}
            >
              {t('settings.feedbackCategoryLabel')}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {categories.map(cat => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      border: isSelected
                        ? '1px solid var(--accent-primary)'
                        : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected
                        ? 'var(--accent-primary-glow)'
                        : 'var(--bg-surface)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ color: isSelected ? 'var(--accent-primary)' : cat.color }}>
                      {cat.icon}
                    </span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label
                htmlFor="feedback-message-input"
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                {t('settings.feedbackMessageLabel')} <span style={{ color: 'var(--accent-primary)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {message.length} / 3000
              </span>
            </div>
            <textarea
              id="feedback-message-input"
              rows={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={placeholderText}
              maxLength={3000}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: touched && !isValid ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                lineHeight: 1.55,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
            />
            {touched && !isValid && (
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#ef4444' }}>
                {t('settings.feedbackValidationMinLength')}
              </p>
            )}
          </div>

          {/* Optional Email Field */}
          <div>
            <label
              htmlFor="feedback-email-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.35rem',
              }}
            >
              <Mail size={13} style={{ color: 'var(--text-muted)' }} />
              <span>{t('settings.feedbackEmailLabel')}</span>
            </label>
            <input
              id="feedback-email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('settings.feedbackEmailPlaceholder')}
              style={{
                width: '100%',
                maxWidth: '420px',
                padding: '0.55rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {t('settings.feedbackEmailDesc')}
            </p>
          </div>

          {/* Anonymous Diagnostics Box */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={e => setIncludeDiagnostics(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
              />
              <span>{t('settings.feedbackIncludeDiagnostics')}</span>
            </label>

            {includeDiagnostics && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.45rem',
                  paddingLeft: '1.45rem',
                  fontSize: '0.73rem',
                }}
              >
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Monitor size={11} />
                  <span>OS: {diagnostics.platform}</span>
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  App: v{diagnostics.appVersion}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Runtime: {diagnostics.isDesktop ? 'Tauri Desktop' : 'Web Browser'}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Display: {diagnostics.screenResolution}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Locale: {diagnostics.language}
                </span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                paddingLeft: '1.45rem',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
              }}
            >
              <ShieldCheck size={12} style={{ color: '#10b981', flexShrink: 0 }} />
              <span>{t('settings.feedbackDiagnosticsPrivacy')}</span>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '0.2rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || message.trim().length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                padding: '0.6rem 1.4rem',
                borderRadius: '8px',
                fontWeight: 600,
                opacity: isSubmitting || message.trim().length === 0 ? 0.6 : 1,
                cursor: isSubmitting || message.trim().length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>{t('settings.feedbackSubmitting')}</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>{t('settings.feedbackSubmitButton')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
