import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PESO_AI_DISCLAIMER, PESO_AI_SUGGESTIONS } from '@perakita/shared';
import { Screen, AppText, IconButton } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme/fonts';
import { sendAiChat } from '@/services/aiService';

type Message = { id: string; role: 'user' | 'assistant'; text: string };

const SUGGESTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Can I afford to spend ₱500 today?': 'wallet-outline',
  'Where did most of my money go?': 'pie-chart-outline',
  'What bills are coming up?': 'calendar-outline',
  'How is my financial health?': 'heart-outline',
  'How can I reach my savings goal?': 'flag-outline',
  'Why is my balance going down quickly?': 'trending-down-outline',
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AiAssistantScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string | string[] }>();
  const listRef = useRef<FlatList<Message>>(null);
  const initialQuestionSent = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!user?.id || !trimmed || loading) return;

    const userMsg: Message = { id: newId(), role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollToEnd();

    try {
      const reply = await sendAiChat(user.id, trimmed);
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', text: reply }]);
      scrollToEnd();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          text: 'I could not read your finances right now. Try again after adding transactions or completing onboarding.',
        },
      ]);
      scrollToEnd();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const question = Array.isArray(q) ? q[0] : q;
    if (!question?.trim() || !user?.id || initialQuestionSent.current) return;
    initialQuestionSent.current = true;
    void send(question);
  }, [q, user?.id]);

  const renderSuggestionChip = (s: string, compact = false) => (
    <Pressable
      key={s}
      disabled={loading}
      onPress={() => void send(s)}
      style={({ pressed }) => [
        compact ? styles.chipCompact : styles.chip,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.primaryMuted : colors.surfaceElevated,
          opacity: loading ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons
        color={colors.primary}
        name={SUGGESTION_ICONS[s] ?? 'help-circle-outline'}
        size={compact ? 14 : 16}
      />
      <AppText style={compact ? styles.chipCompactText : styles.chipText}>{s}</AppText>
    </Pressable>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.rowUser : styles.rowAssistant]}>
        {!isUser ? (
          <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons color={colors.primary} name="sparkles" size={16} />
          </View>
        ) : null}
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
              : {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderBottomLeftRadius: 4,
                },
          ]}
        >
          <AppText style={isUser ? { color: '#FFFFFF' } : undefined}>{item.text}</AppText>
        </View>
        {isUser ? (
          <View style={[styles.avatar, { backgroundColor: colors.inputBackground }]}>
            <Ionicons color={colors.textSecondary} name="person" size={16} />
          </View>
        ) : null}
      </View>
    );
  };

  const ListHeader = messages.length === 0 ? (
    <View style={styles.welcome}>
      <View style={[styles.heroIcon, { backgroundColor: colors.primaryMuted }]}>
        <Ionicons color={colors.primary} name="chatbubble-ellipses" size={28} />
      </View>
      <AppText variant="title">AI financial assistant</AppText>
      <AppText muted style={styles.welcomeBody}>
        Answers are based on your recorded balances, bills, budgets, and goals — instantly and offline.
      </AppText>
      <AppText muted variant="caption" style={styles.suggestLabel}>
        Try asking
      </AppText>
      <View style={styles.suggestions}>
        {PESO_AI_SUGGESTIONS.map((s) => renderSuggestionChip(s))}
      </View>
    </View>
  ) : null;

  return (
    <Screen scroll={false} padded={false}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top }]}>
        <IconButton accessibilityLabel="Close" name="close" onPress={() => router.back()} />
        <View style={styles.headerText}>
          <AppText variant="title">AI assistant</AppText>
          <AppText muted variant="caption">
            Powered by your PESO data
          </AppText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.flex}
      >
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.list}
          data={messages}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListFooterComponent={
            loading ? (
              <View style={[styles.messageRow, styles.rowAssistant]}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons color={colors.primary} name="sparkles" size={16} />
                </View>
                <View style={[styles.bubble, styles.typing, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <AppText muted variant="caption">
                    Thinking…
                  </AppText>
                </View>
              </View>
            ) : null
          }
          ListHeaderComponent={ListHeader}
          onContentSizeChange={scrollToEnd}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
        />

        <View
          style={[
            styles.composer,
            {
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: colors.background,
            },
          ]}
        >
          <AppText muted variant="caption" style={styles.disclaimer}>
            {PESO_AI_DISCLAIMER}
          </AppText>
          {messages.length > 0 ? (
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.compactSuggestions}
            >
              {PESO_AI_SUGGESTIONS.map((s) => renderSuggestionChip(s, true))}
            </ScrollView>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              editable={!loading}
              multiline
              onChangeText={setInput}
              onSubmitEditing={() => void send(input)}
              placeholder="Ask about spending, bills, goals…"
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
              value={input}
            />
            <Pressable
              accessibilityLabel="Send message"
              disabled={loading || !input.trim()}
              onPress={() => void send(input)}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: input.trim() && !loading ? colors.primary : colors.inputBackground,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                color={input.trim() && !loading ? '#FFFFFF' : colors.textMuted}
                name="send"
                size={18}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, alignItems: 'center' },
  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  welcome: { alignItems: 'center', gap: 10, paddingBottom: 8 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  welcomeBody: { textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  suggestLabel: { alignSelf: 'flex-start', marginTop: 8 },
  suggestions: { width: '100%', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  chipText: { flex: 1, lineHeight: 20 },
  compactSuggestions: { gap: 8, paddingVertical: 2 },
  chipCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 280,
  },
  chipCompactText: { lineHeight: 18, fontSize: 13 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  disclaimer: { lineHeight: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
