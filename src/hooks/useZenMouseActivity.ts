import { useEffect, useRef } from 'react';

interface MouseCoordinates {
  x: number;
  y: number;
}

let lastMousePos: MouseCoordinates | null = null;
let lastTypingTime = 0;
let lastScrollTime = 0;
let lastEvaluatedEvent: MouseEvent | null = null;
let lastEvaluatedResult = false;

let globalSubscriberCount = 0;

function handleGlobalCaptureKeyDown(e: KeyboardEvent) {
  // Ignore standalone modifier keys
  if (
    e.key === 'Control' ||
    e.key === 'Alt' ||
    e.key === 'Shift' ||
    e.key === 'Meta'
  ) {
    return;
  }
  lastTypingTime = Date.now();
}

function handleGlobalCaptureScroll() {
  lastScrollTime = Date.now();
}

function attachGlobalListeners() {
  if (typeof window === 'undefined') return;
  window.addEventListener('keydown', handleGlobalCaptureKeyDown, { capture: true, passive: true });
  window.addEventListener('scroll', handleGlobalCaptureScroll, { capture: true, passive: true });
}

function detachGlobalListeners() {
  if (typeof window === 'undefined') return;
  window.removeEventListener('keydown', handleGlobalCaptureKeyDown, true);
  window.removeEventListener('scroll', handleGlobalCaptureScroll, true);
  lastMousePos = null;
  lastEvaluatedEvent = null;
  lastEvaluatedResult = false;
}

function subscribeGlobalActivity() {
  if (globalSubscriberCount === 0) {
    attachGlobalListeners();
  }
  globalSubscriberCount++;
}

function unsubscribeGlobalActivity() {
  globalSubscriberCount = Math.max(0, globalSubscriberCount - 1);
  if (globalSubscriberCount === 0) {
    detachGlobalListeners();
  }
}

/**
 * Determines whether a mousemove event represents a genuine, intentional user mouse gesture,
 * as opposed to:
 * 1. Synthetic mousemove events dispatched by WebKit/Blink (e.g. macOS Tahoe 26.2.2) when
 *    content scrolls underneath a resting mouse cursor (e.g. typewriter scroll on Enter).
 * 2. Stationary cursor hit-test recalculations (dist === 0, movementX/Y === 0).
 * 3. Micro-jitters caused by desk vibrations or typing heavily on a keyboard (< 3px).
 * 4. Cursor shifts immediately during or following keyboard typing / scrolling (< 15px within cooldown).
 */
export function isRealUserMouseMove(e: MouseEvent): boolean {
  if (e === lastEvaluatedEvent) {
    return lastEvaluatedResult;
  }

  lastEvaluatedEvent = e;

  const now = Date.now();
  const timeSinceTyping = now - lastTypingTime;
  const timeSinceScroll = now - lastScrollTime;

  // Initial event before any known coordinates
  if (!lastMousePos) {
    lastMousePos = { x: e.clientX, y: e.clientY };

    // If movementX and movementY are 0, this is a synthetic event on scroll / layout shift
    if (e.movementX === 0 && e.movementY === 0) {
      lastEvaluatedResult = false;
      return false;
    }

    // If typing or scrolling occurred recently, suppress initial movement
    if (timeSinceTyping < 400 || timeSinceScroll < 250) {
      lastEvaluatedResult = false;
      return false;
    }

    lastEvaluatedResult = true;
    return true;
  }

  const dx = e.clientX - lastMousePos.x;
  const dy = e.clientY - lastMousePos.y;
  const dist = Math.hypot(dx, dy);

  // Update last recorded coordinates
  lastMousePos = { x: e.clientX, y: e.clientY };

  // 1. Synthetic event: cursor coordinates in viewport have not moved at all
  if (dist === 0 && e.movementX === 0 && e.movementY === 0) {
    lastEvaluatedResult = false;
    return false;
  }

  // 2. Deadband: ignore micro-jitters (< 3px) from desk vibrations / keyboard typing
  if (dist < 3) {
    lastEvaluatedResult = false;
    return false;
  }

  // 3. Typing & scroll suppression:
  // When hitting Enter or typing, typewriter scrolling causes layout adjustments.
  // Suppress mouse movements under 15px occurring within 400ms of typing or 250ms of scrolling.
  if ((timeSinceTyping < 400 || timeSinceScroll < 250) && dist < 15) {
    lastEvaluatedResult = false;
    return false;
  }

  lastEvaluatedResult = true;
  return true;
}

/**
 * Record a manual typing event timestamp (e.g. from keydown handlers).
 */
export function recordTypingActivity(e?: KeyboardEvent) {
  if (e) {
    if (
      e.key === 'Control' ||
      e.key === 'Alt' ||
      e.key === 'Shift' ||
      e.key === 'Meta'
    ) {
      return;
    }
  }
  lastTypingTime = Date.now();
}

/**
 * Hook for Zen mode UI components to respond only to genuine user mouse movements
 * and typing events, preventing phantom UI reveals on Enter / typewriter scrolls.
 */
export function useZenMouseActivity(
  isEnabled: boolean,
  onRealMouseMove: (e: MouseEvent) => void,
  onTypingKeyDown?: (e: KeyboardEvent) => void
) {
  const onMoveRef = useRef(onRealMouseMove);
  onMoveRef.current = onRealMouseMove;

  const onKeyRef = useRef(onTypingKeyDown);
  onKeyRef.current = onTypingKeyDown;

  useEffect(() => {
    if (!isEnabled) return;

    subscribeGlobalActivity();

    const handleMouseMove = (e: MouseEvent) => {
      if (isRealUserMouseMove(e)) {
        onMoveRef.current(e);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      recordTypingActivity(e);
      onKeyRef.current?.(e);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      unsubscribeGlobalActivity();
    };
  }, [isEnabled]);
}
