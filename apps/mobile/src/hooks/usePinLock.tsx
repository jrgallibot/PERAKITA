import { useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { hasPin } from '@/services/pinLockService';
import { PinLockScreen } from '@/components/PinLockScreen';

export function PinLockGate({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  useEffect(() => {
    void hasPin().then(setPinEnabled);
  }, []);

  useEffect(() => {
    if (!pinEnabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [pinEnabled]);

  if (pinEnabled && locked) {
    return <PinLockScreen onUnlock={() => setLocked(false)} />;
  }

  return <>{children}</>;
}
