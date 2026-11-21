import { useEffect, useState } from 'react';

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

export function useTvControls(started: boolean) {
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement);
  const [keepAwake, setKeepAwake] = useState(true);
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    if (!started || !keepAwake || !navigator.wakeLock) return;
    let lock: WakeLockSentinel | undefined, pending = false, current = true;
    const sync = async () => {
      if (pending || (lock && !lock.released) || document.visibilityState !== 'visible') return;
      pending = true;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (current) lock = next;
        else void next.release();
      } catch { /* Chrome can decline wake lock when power is low. */ }
      finally { pending = false; }
    };
    void sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      current = false;
      void lock?.release();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [started, keepAwake]);

  return { fullscreen, keepAwake, setKeepAwake };
}
