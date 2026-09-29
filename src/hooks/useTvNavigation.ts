import { useEffect, useRef } from 'react';
import type { FocusSection } from '../types/iptv';

interface TvNavigationProps {
  currentSection: FocusSection;
  setSection: (section: FocusSection) => void;
  onEnter: () => void;
  onBack: () => void;
  onArrowUp: () => void;
  onArrowDown: () => void;
  onArrowLeft: () => void;
  onArrowRight: () => void;
  enabled?: boolean;
}

export function useTvNavigation({
  enabled = true,
  onEnter,
  onBack,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
}: TvNavigationProps) {
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    // Register Tizen TV specific remote keys if available
    try {
      const tizen = (window as unknown as { tizen?: { tvinputdevice?: { registerKey: (k: string) => void } } }).tizen;
      if (tizen && tizen.tvinputdevice) {
        tizen.tvinputdevice.registerKey('MediaPlay');
        tizen.tvinputdevice.registerKey('MediaPause');
        tizen.tvinputdevice.registerKey('MediaStop');
        tizen.tvinputdevice.registerKey('ChannelUp');
        tizen.tvinputdevice.registerKey('ChannelDown');
      }
    } catch {
      // Ignore if not in Tizen environment
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an active text input unless it's Enter/Esc/ArrowUp
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      // Key Code 10009 is Samsung Tizen Return / Back key
      // Key Code 461 is LG webOS Back key
      // Key Code 4 is Android TV Back key
      const isBackKey =
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.keyCode === 10009 ||
        e.keyCode === 461 ||
        e.keyCode === 4;

      if (isBackKey) {
        if (!isInputActive || e.key === 'Escape') {
          e.preventDefault();
          onBack();
          return;
        }
      }

      if (isInputActive && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        // Allow text cursor navigation within input
        return;
      }

      // Check key codes for DPAD support across TV vendors
      const isUp = e.key === 'ArrowUp' || e.keyCode === 19;
      const isDown = e.key === 'ArrowDown' || e.keyCode === 20;
      const isLeft = e.key === 'ArrowLeft' || e.keyCode === 21;
      const isRight = e.key === 'ArrowRight' || e.keyCode === 22;
      const isEnter =
        e.key === 'Enter' ||
        e.key === 'Select' ||
        e.keyCode === 13 ||
        e.keyCode === 23 ||
        e.keyCode === 66;

      if (!isUp && !isDown && !isLeft && !isRight && !isEnter) {
        return;
      }

      // Throttle rapid remote events: prevent remote contact bounce & rapid skipping
      const now = Date.now();
      const throttleDuration = e.repeat ? 200 : 150;
      if (now - lastKeyTimeRef.current < throttleDuration) {
        e.preventDefault();
        return;
      }
      lastKeyTimeRef.current = now;

      if (isUp) {
        e.preventDefault();
        onArrowUp();
      } else if (isDown) {
        e.preventDefault();
        onArrowDown();
      } else if (isLeft) {
        e.preventDefault();
        onArrowLeft();
      } else if (isRight) {
        e.preventDefault();
        onArrowRight();
      } else if (isEnter) {
        e.preventDefault();
        onEnter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    onEnter,
    onBack,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
  ]);
}
