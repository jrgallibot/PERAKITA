import { APP_CREDIT } from '@perakita/shared';
import { AppText } from '@/components/ui';
import { StyleSheet, View } from 'react-native';

export function DeveloperCredit() {
  return (
    <View style={styles.wrap}>
      <AppText muted style={styles.text} variant="caption">
        {APP_CREDIT}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  text: { textAlign: 'center' },
});
