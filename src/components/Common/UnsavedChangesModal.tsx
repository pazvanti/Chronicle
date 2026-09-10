import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { AlertTriangle, X, Save, Trash2, ArrowRight, Loader2, BookOpen } from 'lucide-react';

export const UnsavedChangesModal: React.FC = () => {
  const {
    book,
    pendingUnsavedAction,
    setPendingUnsavedAction,
    saveProject,
    storageTarget,
    setIsSaveDestinationOpen,
    showNotification,
    totalWordCount,
  } = useEpub();

  const [isSaving, setIsSaving] = useState(false);

  const handleCancel = () => {
    if (isSaving) return;
    setPendingUnsavedAction(null);
  };

  useEscapeKey(handleCancel, Boolean(pendingUnsavedAction));

  if (!pendingUnsavedAction) return null;

  const handleDiscardAndProceed = async () => {
    if (isSaving) return;
    const action = pendingUnsavedAction;
    setPendingUnsavedAction(null);
    try {
      await action.onProceed();
    } catch (err: any) {
      console.error('Failed to execute proceeding action:', err);
      showNotification('error', `Failed to execute action: ${err?.message || 'Error'}`);
    }
  };

  const handleSaveAndProceed = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (!storageTarget) {
        // Unsaved new project without storage destination
        setPendingUnsavedAction(null);
        setIsSaveDestinationOpen(true);
        showNotification('info', 'Please choose a destination to save your current manuscript first.');
        return;
      }

      await saveProject();
      const action = pendingUnsavedAction;
      setPendingUnsavedAction(null);
      await action.onProceed();
    } catch (err: any) {
      console.error('Failed to save project before proceeding:', err);
      showNotification('error', `Failed to save current manuscript: ${err?.message || 'Error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getActionName = () => {
    switch (pendingUnsavedAction.actionType) {
      case 'new':
        return 'Create New';
      case 'open':
        return 'Open File';
      case 'cloud':
        return 'Open Cloud File';
      case 'sample':
        return 'Load Sample';
      default:
        return 'Proceed';
    }
  };

  const currentTitle = book?.metadata.title || 'Untitled Manuscript';
  const currentChaptersCount = book?.chapters.length || 0;

  return (
    <div
      className="modal-overlay"
      onClick={handleCancel}
      style={{
        zIndex: 350,
        background: 'rgba(5, 5, 10, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
    >
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '92%',
          background: 'linear-gradient(175deg, #1c1815 0%, #121012 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.85), 0 0 35px rgba(245, 158, 11, 0.15)',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 1.5rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'radial-gradient(circle at 10% 20%, rgba(245, 158, 11, 0.18) 0%, transparent 70%)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
              flexShrink: 0,
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.25)',
            }}
          >
            <AlertTriangle size={22} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                Unsaved Changes
              </span>
            </div>
            <h2
              id="unsaved-changes-title"
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#ffffff',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Discard unsaved edits?
            </h2>
          </div>

          <button
            onClick={handleCancel}
            className="btn-icon btn-sm"
            title="Cancel and return to editor (Esc)"
            disabled={isSaving}
            style={{
              color: 'var(--text-muted)',
              borderRadius: '8px',
              padding: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Current Manuscript Summary Box */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
            }}
          >
            <BookOpen size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentTitle}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {currentChaptersCount} {currentChaptersCount === 1 ? 'chapter' : 'chapters'} •{' '}
                {totalWordCount.toLocaleString()} words • <span style={{ color: '#fbbf24' }}>Unsaved changes</span>
              </div>
            </div>
          </div>

          {/* Action Context Message */}
          <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {pendingUnsavedAction.description}
          </div>

          {/* Warning Banner */}
          <div
            style={{
              padding: '0.75rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              fontSize: '0.8rem',
              color: '#fca5a5',
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 600 }}>Note:</div>
            <div>Any modifications, chapters, or notes written since your last save will be permanently lost.</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem 1.25rem',
            background: 'rgba(0, 0, 0, 0.25)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={isSaving}
            style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleDiscardAndProceed}
              disabled={isSaving}
              style={{
                padding: '0.5rem 0.95rem',
                fontSize: '0.82rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              title="Discard unsaved changes and proceed"
            >
              <Trash2 size={14} />
              <span>Discard & {getActionName()}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSaveAndProceed}
              disabled={isSaving}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
              title="Save current manuscript, then proceed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save First</span>
                  <ArrowRight size={13} style={{ opacity: 0.7 }} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
