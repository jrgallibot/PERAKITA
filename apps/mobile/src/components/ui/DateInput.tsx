import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function formatDisplay(value: string): string {
  return parseIsoDate(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
  minimumDate?: Date;
}

export function DateInput({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  optional = false,
  minimumDate,
}: DateInputProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = value ? parseIsoDate(value) : new Date();

  const onPick = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'dismissed' || !date) return;
      onChange(toIsoDate(date));
      return;
    }
    if (date) onChange(toIsoDate(date));
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[
          styles.inputWrap,
          { backgroundColor: colors.inputBackground, borderColor: colors.border },
        ]}
      >
        <Ionicons color={colors.primary} name="calendar-outline" size={20} />
        <Text
          style={[
            styles.value,
            { color: value ? colors.textPrimary : colors.textMuted },
          ]}
        >
          {value ? formatDisplay(value) : placeholder}
        </Text>
        {optional && value ? (
          <Pressable
            accessibilityLabel="Clear date"
            hitSlop={8}
            onPress={() => {
              setOpen(false);
              onChange('');
            }}
          >
            <Ionicons color={colors.textMuted} name="close-circle" size={20} />
          </Pressable>
        ) : (
          <Ionicons color={colors.textMuted} name="chevron-down" size={18} />
        )}
      </Pressable>
      {open ? (
        <View style={styles.picker}>
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={minimumDate}
            mode="date"
            onChange={onPick}
            value={selected}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={() => setOpen(false)}
              style={[styles.done, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  inputWrap: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  value: { flex: 1, fontSize: 16, paddingVertical: 12 },
  picker: { marginTop: 4, marginBottom: 8 },
  done: {
    alignSelf: 'flex-end',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  doneText: { color: '#FFFFFF', fontWeight: '600' },
});
