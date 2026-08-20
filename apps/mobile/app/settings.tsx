import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  APP_ABOUT,
  APP_ABOUT_POINTS,
  APP_CREDIT,
  APP_NAME,
  ageFromBirthday,
  changePasswordSchema,
  profileSchema,
  type ChangePasswordInput,
  type ProfileInput,
  type Sex,
  type ThemeMode,
} from '@perakita/shared';
import { supabase } from '@/lib/supabase';
import {
  changePassword,
  fetchProfileFromCloud,
  getProfile,
  saveProfile,
  saveThemePreference,
  uploadAvatar,
} from '@/services/settingsService';
import { syncNow, getSyncDestinationLabel } from '@/services/syncService';
import { notify } from '@/stores/toastStore';
import { useThemeStore } from '@/stores/themeStore';
import { Screen, AppText, Button, Card, AmountText, Input } from '@/components/ui';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStore } from '@/stores/networkStore';
import { BrandLogo } from '@/components/BrandLogo';
import { transactionRepository } from '@/database/repositories/transactionRepository';
import {
  signedTransactionAmount,
  transactionKindLabel,
} from '@/lib/transactionLabels';
import { getWebAppLink, getWebAppUrl } from '@/lib/webApp';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const SEX_OPTIONS: { label: string; value: Sex | '' }[] = [
  { label: 'Prefer not to say', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

function parseBirthday(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(2000, 0, 1);
}

function toIsoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const mode = useThemeStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const isConnected = useNetworkStore((s) => s.isConnected);
  const syncStatus = useNetworkStore((s) => s.syncStatus);
  const pendingCount = useNetworkStore((s) => s.pendingCount);

  const [displayName, setDisplayName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [birthday, setBirthday] = useState('');
  const [sex, setSex] = useState<Sex | ''>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ['transactions', user?.id, 'settings-log'],
    enabled: !!user?.id,
    queryFn: () => transactionRepository.findAll(user!.id, 500),
  });
  const recentLogs = logs.slice(0, 8);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (isConnected) {
        try {
          const cloud = await fetchProfileFromCloud(user!.id);
          if (cloud) return cloud;
        } catch {
          // fall back to local
        }
      }
      return getProfile(user!.id);
    },
  });

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setContact(profile.contact ?? '');
    setAddress(profile.address ?? '');
    setBirthday(profile.birthday ?? '');
    setSex(profile.sex ?? '');
    setAvatarUrl(profile.avatar_url);
  }, [profile]);

  const age = useMemo(() => ageFromBirthday(birthday || null), [birthday]);
  const initials = (displayName || user?.email || '?').trim().slice(0, 1).toUpperCase();

  const setTheme = async (value: ThemeMode) => {
    await saveThemePreference(value);
    notify.info(`${value === 'system' ? 'System' : value === 'dark' ? 'Dark' : 'Light'} theme applied`);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      notify.error(error.message);
      return;
    }
    router.replace('/(auth)/login');
  };

  const runSync = async () => {
    if (!user?.id) return;
    if (!isConnected) {
      notify.error('Connect to the internet to sync with the cloud.');
      return;
    }
    try {
      await syncNow(user.id);
      await fetchProfileFromCloud(user.id);
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['loans', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      notify.success(`Synced — updates show on ${getSyncDestinationLabel()}`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Sync failed.');
    }
  };

  const onSaveProfile = async () => {
    if (!user?.id) return;
    const parsed = profileSchema.safeParse({
      display_name: displayName,
      contact,
      address,
      birthday,
      sex: sex || null,
    } satisfies ProfileInput);
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? 'Check your profile details');
      return;
    }
    if (!isConnected) {
      notify.error('Connect to the internet to save your profile.');
      return;
    }
    setSavingProfile(true);
    try {
      const saved = await saveProfile(user.id, parsed.data);
      setAvatarUrl(saved.avatar_url);
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', user.id] });
      notify.success('Profile saved');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const onPickAvatar = async () => {
    if (!user?.id) return;
    if (!isConnected) {
      notify.error('Connect to the internet to upload a photo.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify.error('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.id, asset.uri, asset.mimeType ?? 'image/jpeg');
      setAvatarUrl(url);
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      notify.success('Profile photo updated');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onChangePassword = async () => {
    if (!user?.email) return;
    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    } satisfies ChangePasswordInput);
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? 'Check your password fields');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(user.email, parsed.data.currentPassword, parsed.data.newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify.success('Password updated');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const syncCopy = !isConnected
    ? 'Offline — changes stay on this phone until you reconnect.'
    : syncStatus === 'syncing'
      ? `Uploading to the cloud used by ${getSyncDestinationLabel()}…`
      : pendingCount > 0
        ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to upload to ${getSyncDestinationLabel()}.`
        : `Phone and cloud are in sync. Open ${getSyncDestinationLabel()} (same account) to see your data.`;

  return (
    <Screen>
      <View style={styles.brandRow}>
        <BrandLogo showLabel size={40} />
      </View>
      <AppText variant="title" style={styles.pageTitle}>
        Settings
      </AppText>

      <Card style={styles.section}>
        <AppText muted variant="caption">
          PROFILE
        </AppText>
        <Pressable onPress={onPickAvatar} style={styles.avatarRow}>
          <View style={[styles.avatar, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <AppText style={styles.avatarInitials}>{initials}</AppText>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <AppText>Profile photo</AppText>
            <AppText muted variant="caption">
              {uploadingAvatar ? 'Uploading…' : 'Tap to choose a new picture'}
            </AppText>
          </View>
        </Pressable>

        <Input label="Full name" onChangeText={setDisplayName} value={displayName} />
        <Input editable={false} label="Email" value={user?.email ?? ''} />
        <Input
          keyboardType="phone-pad"
          label="Contact number"
          onChangeText={setContact}
          value={contact}
        />
        <Input
          label="Address"
          multiline
          onChangeText={setAddress}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          value={address}
        />

        <AppText muted variant="caption">
          Birthday{age != null ? ` · age ${age}` : ''}
        </AppText>
        <Pressable
          onPress={() => setShowBirthdayPicker(true)}
          style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
        >
          <AppText>{birthday || 'Select birthday'}</AppText>
        </Pressable>
        {showBirthdayPicker ? (
          <DateTimePicker
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            value={parseBirthday(birthday)}
            onChange={(_, date) => {
              if (Platform.OS !== 'ios') setShowBirthdayPicker(false);
              if (date) setBirthday(toIsoDay(date));
            }}
          />
        ) : null}
        {Platform.OS === 'ios' && showBirthdayPicker ? (
          <Button onPress={() => setShowBirthdayPicker(false)} title="Done" variant="secondary" />
        ) : null}

        <AppText muted variant="caption">
          Sex
        </AppText>
        <View style={styles.segment}>
          {SEX_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => setSex(opt.value)}
              style={[
                styles.sexBtn,
                {
                  backgroundColor: sex === opt.value ? colors.primary : colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: sex === opt.value ? '#FFFFFF' : colors.textPrimary,
                  fontWeight: '600',
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button loading={savingProfile} onPress={onSaveProfile} title="Save profile" />
      </Card>

      <Card style={styles.section}>
        <AppText muted variant="caption">
          SECURITY
        </AppText>
        <Input
          label="Current password"
          onChangeText={setCurrentPassword}
          secureTextEntry
          secureToggle
          value={currentPassword}
        />
        <Input
          label="New password"
          onChangeText={setNewPassword}
          secureTextEntry
          secureToggle
          value={newPassword}
        />
        <Input
          label="Confirm new password"
          onChangeText={setConfirmPassword}
          secureTextEntry
          secureToggle
          value={confirmPassword}
        />
        <Button loading={savingPassword} onPress={onChangePassword} title="Update password" />
        <Button
          onPress={() => router.push('/(auth)/forgot-password' as never)}
          title="Forgot password? Email reset"
          variant="secondary"
        />
      </Card>

      <Card style={styles.section}>
        <AppText muted variant="caption">
          APPEARANCE
        </AppText>
        <View style={styles.segment}>
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setTheme(opt.value)}
              style={[
                styles.segmentBtn,
                {
                  backgroundColor: mode === opt.value ? colors.primary : colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: mode === opt.value ? '#FFFFFF' : colors.textPrimary,
                  fontWeight: '600',
                  fontSize: 14,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <AppText muted variant="caption">
          SYNC
        </AppText>
        <AppText>{syncCopy}</AppText>
        <AppText muted variant="caption">
          Cloud backend shared with {getWebAppUrl()}
        </AppText>
        <Button
          disabled={syncStatus === 'syncing'}
          onPress={runSync}
          title={syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}
          variant="secondary"
        />
        <Button
          onPress={() => void Linking.openURL(getWebAppLink('/dashboard'))}
          title="Open web dashboard"
          variant="secondary"
        />
      </Card>

      <Card style={styles.section}>
        <AppText muted variant="caption">
          WEB DASHBOARD
        </AppText>
        <AppText>
          Sign in on the web with the same email to see synced balances, loans, and profile at{' '}
          {getSyncDestinationLabel()}.
        </AppText>
        <Button
          onPress={() => void Linking.openURL(getWebAppLink('/dashboard'))}
          title="Open perakita-web.vercel.app"
          variant="secondary"
        />
      </Card>

      <Card style={styles.section}>
        <AppText>
          Full history of income, expenses, loans, and payments saved on this phone.
        </AppText>
        {recentLogs.length === 0 ? (
          <AppText muted>No transactions yet.</AppText>
        ) : (
          recentLogs.map((tx, i) => (
            <View
              key={tx.id}
              style={[
                styles.logRow,
                i < recentLogs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <AppText>{tx.description || tx.category_name || transactionKindLabel(tx.type)}</AppText>
                <AppText muted variant="caption">
                  {transactionKindLabel(tx.type)} · {tx.transaction_date}
                </AppText>
              </View>
              <AmountText
                amount={signedTransactionAmount(tx.type, tx.amount)}
                showSign
                size="small"
              />
            </View>
          ))
        )}
        <Button
          onPress={() => router.push('/activity-log' as never)}
          title={logs.length > 8 ? `See all ${logs.length} records` : 'Open full log'}
          variant="secondary"
        />
      </Card>

      <Card style={styles.section}>
        <AppText muted variant="caption">
          ABOUT {APP_NAME.toUpperCase()}
        </AppText>
        <AppText style={styles.about}>{APP_ABOUT}</AppText>
        {APP_ABOUT_POINTS.map((point) => (
          <AppText key={point} muted style={styles.aboutPoint}>
            • {point}
          </AppText>
        ))}
        <AppText muted variant="caption">
          {APP_CREDIT}
        </AppText>
      </Card>

      <Button onPress={logout} title="Sign Out" variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { marginBottom: 8, marginTop: 8 },
  pageTitle: { marginBottom: 16 },
  about: { fontSize: 15, lineHeight: 22 },
  aboutPoint: { fontSize: 14, lineHeight: 20 },
  section: { marginBottom: 16, gap: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { fontSize: 28, fontWeight: '700' },
  dateBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmentBtn: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  sexBtn: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '45%',
    flexGrow: 1,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
