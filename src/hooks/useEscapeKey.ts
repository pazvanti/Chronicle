import { useEffect, useRef } from 'react';

// Global stack of active modal close handlers (LIFO order: topmost modal closes first)
const modalStack: Array<() => void> = [];

let isGlobalListenerAttached = false;

function handleGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && modalStack.length > 0) {
    e.preventDefault();
    e.stopPropagation();
    // Close the topmost active modal
    const topCloseHandler = modalStack[modalStack.length - 1];
    if (topCloseHandler) {
      topCloseHandler();
    }
  }
}

/**
 * Hook to close a modal on Escape key press.
 * Automatically manages modal stacking so that pressing Escape closes only the topmost modal.
 */
export function useEscapeKey(onClose?: () => void, isEnabled: boolean = true) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isEnabled) return;

    if (!isGlobalListenerAttached) {
      window.addEventListener('keydown', handleGlobalKeyDown);
      isGlobalListenerAttached = true;
    }

    const handler = () => {
      if (onCloseRef.current) {
        onCloseRef.current();
      }
    };

    modalStack.push(handler);

    return () => {
      const idx = modalStack.indexOf(handler);
      if (idx !== -1) {
        modalStack.splice(idx, 1);
      }
      if (modalStack.length === 0 && isGlobalListenerAttached) {
        window.removeEventListener('keydown', handleGlobalKeyDown);
        isGlobalListenerAttached = false;
      }
    };
  }, [isEnabled]);
}
