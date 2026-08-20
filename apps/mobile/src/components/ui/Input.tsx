import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme/fonts';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

export function Input({ label, error, secureToggle, secureTextEntry, style, ...props }: InputProps) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.inputBackground,
            borderColor: error ? colors.expense : colors.border,
          },
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          style={[styles.input, { color: colors.textPrimary }, style]}
          {...props}
        />
        {secureToggle && (
          <Pressable
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {error ? <Text style={[styles.error, { color: colors.expense }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: fonts.semibold, marginBottom: 8, letterSpacing: 0.2 },
  inputWrap: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, fontSize: 16, fontFamily: fonts.regular, paddingVertical: 12 },
  error: { fontSize: 13, fontFamily: fonts.medium, marginTop: 6 },
});
