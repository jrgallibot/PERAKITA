import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { APP_NAME } from '@perakita/shared';
import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/providers/ThemeProvider';

interface BrandLogoProps {
  size?: number;
  /** Show "PeraKita" wordmark beside the mark. */
  showLabel?: boolean;
  /** Compact label size for headers. */
  labelVariant?: 'title' | 'display';
}

/** PeraKita mark: teal tile, peso coin, growth sprout (kita). */
export function BrandLogo({
  size = 48,
  showLabel = false,
  labelVariant = 'title',
}: BrandLogoProps) {
  const { colors } = useTheme();
  const mark = (
    <Svg height={size} viewBox="0 0 64 64" width={size}>
      <Defs>
        <LinearGradient id="pkTile" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#14B8A6" />
          <Stop offset="1" stopColor="#0F766E" />
        </LinearGradient>
        <LinearGradient id="pkCoin" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#CCFBF1" />
        </LinearGradient>
      </Defs>
      <Rect fill="url(#pkTile)" height={64} rx={16} width={64} />
      <Circle cx={22} cy={18} fill="#5EEAD4" opacity={0.35} r={10} />
      <Circle cx={32} cy={36} fill="url(#pkCoin)" r={18.5} />
      <Circle
        cx={32}
        cy={36}
        fill="none"
        opacity={0.55}
        r={16}
        stroke="#0D9488"
        strokeDasharray="2.2 2.8"
        strokeWidth={1.4}
      />
      <Path
        d="M26.5 25.5h9.2c4.4 0 7.3 2.3 7.3 5.8 0 2.5-1.5 4.4-4 5.3 3 .9 4.8 2.9 4.8 5.9 0 4.2-3.3 7-8.6 7H26.5V25.5zm5.5 9.8h3.2c2 0 3.2-1 3.2-2.6s-1.2-2.5-3.2-2.5H32v5.1zm0 10.6h3.8c2.3 0 3.7-1.2 3.7-3s-1.4-2.8-3.7-2.8H32v5.8z"
        fill="#0F766E"
      />
      <Path
        d="M45.5 11c5 2.1 8.2 6.1 8.2 10.8 0-5.4-3.7-9.8-8.2-10.8z"
        fill="#99F6E4"
      />
      <Path
        d="M45.5 11c-1.4 4.2-1.1 8.4.8 11.9 2.5-3 3.6-7.1-.8-11.9z"
        fill="#5EEAD4"
      />
      <Path
        d="M45.2 22.8c.2 3.2.1 5.8-.4 8.2"
        fill="none"
        stroke="#99F6E4"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Circle cx={48} cy={14} fill="#ECFDF5" r={1.6} />
    </Svg>
  );

  if (!showLabel) return mark;

  return (
    <View style={styles.row}>
      {mark}
      <View style={styles.copy}>
        <AppText
          variant={labelVariant}
          style={[styles.name, { color: colors.textPrimary, fontSize: labelVariant === 'display' ? 28 : 20 }]}
        >
          {APP_NAME}
        </AppText>
        <AppText muted variant="caption" style={styles.hint}>
          Personal finance
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { gap: 2 },
  name: { marginBottom: 0, letterSpacing: -0.4 },
  hint: { marginTop: -2 },
});
