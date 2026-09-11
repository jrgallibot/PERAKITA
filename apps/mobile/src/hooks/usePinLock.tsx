import { useEffect, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
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
    return (
      <>
        {children}
        <View style={styles.overlay}>
          <PinLockScreen onUnlock={() => setLocked(false)} />
        </View>
      </>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10000,
    elevation: 10000,
  },
});
