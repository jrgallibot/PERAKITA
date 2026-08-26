import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_TAGLINE } from '@perakita/shared';
import { Screen, AppText, Card } from '@/components/ui';
import { BrandLogo } from '@/components/BrandLogo';
import { DeveloperCredit } from '@/components/DeveloperCredit';
import { useTheme } from '@/providers/ThemeProvider';
import { useNetworkStore } from '@/stores/networkStore';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  beforeCard?: ReactNode;
  showBrand?: boolean;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  beforeCard,
  showBrand = true,
}: AuthShellProps) {
  const { colors } = useTheme();
  const isConnected = useNetworkStore((s) => s.isConnected);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, isTablet && styles.tabletScroll]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showBrand ? (
          <View style={styles.brandBlock}>
            <BrandLogo labelVariant="display" showLabel size={56} />
            <AppText muted style={styles.tagline}>
              {APP_TAGLINE}
            </AppText>
          </View>
        ) : null}

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isConnected ? colors.primaryMuted : `${colors.expense}22`,
              borderColor: isConnected ? colors.primary : colors.expense,
            },
          ]}
        >
          <Ionicons
            color={isConnected ? colors.primary : colors.expense}
            name={isConnected ? 'cloud-done-outline' : 'cloud-offline-outline'}
            size={16}
          />
          <AppText
            color={isConnected ? colors.primary : colors.expense}
            style={styles.statusText}
            variant="caption"
          >
            {isConnected
              ? 'Online — changes sync to the cloud'
              : 'Offline — sign in and track on this device, sync when online'}
          </AppText>
        </View>

        {beforeCard}

        <Card elevated style={styles.card}>
          <AppText variant="title">{title}</AppText>
          {subtitle ? (
            <AppText muted variant="caption" style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
          {children}
        </Card>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
        <DeveloperCredit />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8, paddingBottom: 24, gap: 16 },
  tabletScroll: { maxWidth: 440, alignSelf: 'center', width: '100%' },
  brandBlock: { alignItems: 'center', gap: 8, marginBottom: 4 },
  tagline: { textAlign: 'center', paddingHorizontal: 16 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusText: { flex: 1, fontWeight: '600', lineHeight: 18 },
  card: { gap: 4 },
  subtitle: { marginBottom: 12, lineHeight: 20 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
});
