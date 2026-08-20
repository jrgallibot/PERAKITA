import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { SpendingSlice } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from '@/components/ui';

type SpendingDonutProps = {
  slices: SpendingSlice[];
};

export function SpendingDonut({ slices }: SpendingDonutProps) {
  const { colors } = useTheme();
  const size = 120;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const spentPercent = Math.min(100, slices.reduce((sum, slice) => sum + slice.percent, 0));

  return (
    <View style={styles.wrap}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={colors.border}
          strokeWidth={stroke}
        />
        {slices.map((slice) => {
          const length = (slice.percent / 100) * circumference;
          const circle = (
            <Circle
              key={slice.name}
              cx={size / 2}
              cy={size / 2}
              fill="none"
              r={radius}
              stroke={slice.color}
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              strokeWidth={stroke}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += length;
          return circle;
        })}
      </Svg>
      <View style={styles.center}>
        <AppText muted variant="caption">
          Spent
        </AppText>
        <AppText variant="title">{spentPercent}%</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  center: { position: 'absolute', alignItems: 'center' },
});
