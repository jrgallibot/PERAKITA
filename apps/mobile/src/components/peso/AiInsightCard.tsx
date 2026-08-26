import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PESO_AI_DISCLAIMER } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { Card, AppText, Button } from '@/components/ui';
import { fetchAiInsight } from '@/services/aiService';

interface AiInsightCardProps {
  userId: string;
}

export function AiInsightCard({ userId }: AiInsightCardProps) {
  const { colors } = useTheme();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAiInsight(userId)
      .then((text) => {
        if (!cancelled) setInsight(text);
      })
      .catch(() => {
        if (!cancelled) setInsight(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const openAssistant = () => router.push('/ai-assistant' as never);

  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <AppText muted variant="caption">
            Analyzing your finances…
          </AppText>
        </View>
      </Card>
    );
  }

  if (!insight) return null;

  return (
    <Card style={[styles.card, { borderColor: colors.primaryMuted, borderWidth: 1 }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons color={colors.primary} name="sparkles" size={18} />
        </View>
        <View style={styles.flex}>
          <AppText muted variant="caption">
            AI FINANCIAL INSIGHT
          </AppText>
          <AppText style={styles.insight}>{insight}</AppText>
        </View>
      </View>
      <Button onPress={openAssistant} title="Ask a follow-up question" variant="secondary" />
      <AppText muted variant="caption">
        {PESO_AI_DISCLAIMER}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 6 },
  insight: { lineHeight: 22 },
});
