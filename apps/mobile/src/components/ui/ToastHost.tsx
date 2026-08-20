import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '@/theme/fonts';
import { useToastStore } from '@/stores/toastStore';

const STYLES = {
  success: { bg: '#ECFDF5', border: '#34D399', text: '#065F46', label: 'SAVED' },
  error: { bg: '#FEF2F2', border: '#F87171', text: '#991B1B', label: 'ERROR' },
  info: { bg: '#EFF6FF', border: '#60A5FA', text: '#1E40AF', label: 'UPDATED' },
  deleted: { bg: '#FFFBEB', border: '#FBBF24', text: '#92400E', label: 'DELETED' },
};

export function ToastHost() {
  const notice = useToastStore((s) => s.notice);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();

  if (!notice) return null;
  const tone = STYLES[notice.kind];

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable
        onPress={hide}
        style={[styles.card, { backgroundColor: tone.bg, borderColor: tone.border }]}
      >
        <Text style={[styles.label, { color: tone.text }]}>{tone.label}</Text>
        <Text style={[styles.title, { color: tone.text }]}>{notice.title}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  label: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.8, marginBottom: 2 },
  title: { fontSize: 15, fontFamily: fonts.semibold, letterSpacing: -0.1 },
});
