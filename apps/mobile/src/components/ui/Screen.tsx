import { useTheme } from '@/providers/ThemeProvider';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  keyboard?: boolean;
  edges?: Edge[];
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  keyboard = true,
  edges = ['top', 'left', 'right'],
}: ScreenProps) {
  const { colors } = useTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && styles.padded, styles.scrollContent, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[padded && styles.padded, styles.flex, style]}>{children}</View>
  );

  const body = keyboard ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      style={styles.flex}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 20 },
  scrollContent: { flexGrow: 1, paddingBottom: 48 },
});
