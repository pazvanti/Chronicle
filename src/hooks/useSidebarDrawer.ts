import { useEffect, useRef } from 'react';

interface UseSidebarDrawerOptions {
  isOpen: boolean;
  isDocked: boolean;
  onClose: () => void;
  toggleButtonSelector?: string;
}

/**
 * Hook to manage sidebar drawer behavior:
 * - When floating (not docked): handles auto-close on clicking outside or pressing Escape.
 * - When docked: stays docked into the workspace layout without auto-dismissing.
 * - Safely ignores clicks inside the drawer, on modal dialogues/backdrops, and on drawer toggle buttons.
 */
export function useSidebarDrawer<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  isDocked,
  onClose,
  toggleButtonSelector = '[data-sidebar-toggle]',
}: UseSidebarDrawerOptions) {
  const panelRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    // Only attach outside-click and escape dismissal if drawer is open and floating (not docked)
    if (!isOpen || isDocked) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. If click is inside the panel, ignore
      if (panelRef.current && panelRef.current.contains(target)) {
        return;
      }

      // 2. If click is on a modal/dialog/backdrop/tooltip/portal, ignore
      if (
        target.closest(
          '.modal-backdrop, .modal-dialog, .dialog, [role="dialog"], .swal2-container, .confirm-dialog'
        )
      ) {
        return;
      }

      // 3. If click is on a drawer toggle button, ignore so its own onClick can run cleanly
      if (
        target.closest(toggleButtonSelector) ||
        target.closest('[data-sidebar-toggle]')
      ) {
        return;
      }

      // Outside click detected! Close drawer
      onCloseRef.current();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If there's an active modal open, let the modal handle Escape
        if (document.querySelector('.modal-backdrop, [role="dialog"]')) {
          return;
        }
        onCloseRef.current();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDocked, toggleButtonSelector]);

  return panelRef;
}
