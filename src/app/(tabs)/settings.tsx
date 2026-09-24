import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QrCode } from '@/components/qr-code';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useHome } from '@/hooks/use-home';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';

export default function SettingsScreen() {
  const theme = useTheme();
  const { profile, signOut, deleteAccount } = useAuth();
  const { home, members, renameHome, leaveHome } = useHome();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(home?.name ?? '');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);

  if (!home) return null;

  const startEditingName = () => {
    setNameDraft(home.name);
    setRenameError(null);
    setIsEditingName(true);
  };

  const saveName = async () => {
    const message = await renameHome(nameDraft);
    if (message) {
      setRenameError(message);
      return;
    }
    setIsEditingName(false);
  };

  const shareInvite = async () => {
    try {
      await Share.share({
        message: `Join our "${home.name}" list on Basket Buddy! Use invite code ${home.inviteCode} when you set up the app.`,
      });
    } catch {
      // User cancelled or the platform denied the share sheet — nothing to do.
    }
  };

  const joinUrl = Linking.createURL('join', { queryParams: { code: home.inviteCode } });

  const confirmDeleteAccount = () =>
    confirmDestructive(
      'Delete account',
      'This permanently deletes your account and profile. Your Home and its shopping list stay intact for other members. This can\'t be undone.',
      'Delete',
      async () => {
        setIsDeleting(true);
        const message = await deleteAccount();
        setIsDeleting(false);
        if (message) Alert.alert('Could not delete account', message);
      }
    );

  // One stray tap used to drop you out of the Home instantly, and getting
  // back in needs someone to re-share the invite code.
  const confirmLeaveHome = () =>
    confirmDestructive(
      'Leave this Home?',
      `You'll lose access to ${home.name}'s list and calendar until someone shares the invite code with you again.`,
      'Leave',
      leaveHome
    );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.header}>
            {isEditingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  autoFocus
                  style={[styles.editNameInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
                <Pressable onPress={saveName} hitSlop={8} style={styles.editNameAction}>
                  <ThemedText type="smallBold">Save</ThemedText>
                </Pressable>
                <Pressable onPress={() => setIsEditingName(false)} hitSlop={8} style={styles.editNameAction}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Cancel
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={startEditingName} style={styles.titleRow} hitSlop={8}>
                <ThemedText type="title" style={styles.title}>
                  {home.name}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.editGlyph}>
                  ✎
                </ThemedText>
              </Pressable>
            )}
            {renameError ? (
              <ThemedText type="small" style={styles.errorText}>
                {renameError}
              </ThemedText>
            ) : null}
            <ThemedText themeColor="textSecondary">
              Signed in as {profile?.nickname ?? '…'}
            </ThemedText>
          </ThemedView>

          <ThemedView style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              INVITE CODE
            </ThemedText>
            <ThemedText style={styles.inviteCode}>{home.inviteCode}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Share this code — or a QR code — so a roommate can join your Home and see the same
              list.
            </ThemedText>
            <View style={styles.inviteActions}>
              <Pressable
                onPress={shareInvite}
                style={({ pressed }) => [
                  styles.shareButton,
                  styles.flex1,
                  { backgroundColor: theme.text },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor="background">
                  Share invite
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setShowQrCode((prev) => !prev)}
                style={({ pressed }) => [
                  styles.shareButton,
                  styles.flex1,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">{showQrCode ? 'Hide QR code' : 'Show QR code'}</ThemedText>
              </Pressable>
            </View>
            {showQrCode ? (
              <View style={styles.qrWrapper}>
                <View style={styles.qrCard}>
                  <QrCode value={joinUrl} size={180} />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.qrCaption}>
                  Scanning this opens Basket Buddy straight to the join screen with the invite code
                  filled in.
                </ThemedText>
              </View>
            ) : null}
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              MEMBERS
            </ThemedText>
            {members.map((member) => (
              <View key={member.userId} style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">{member.nickname.charAt(0).toUpperCase()}</ThemedText>
                </View>
                <ThemedText>{member.nickname}</ThemedText>
              </View>
            ))}
          </ThemedView>

          <Pressable onPress={confirmLeaveHome} style={styles.textAction}>
            <ThemedText type="small" style={styles.destructive}>
              Leave this Home
            </ThemedText>
          </Pressable>

          <Pressable onPress={signOut} style={styles.textAction}>
            <ThemedText type="small" themeColor="textSecondary">
              Sign out
            </ThemedText>
          </Pressable>

          <Pressable onPress={confirmDeleteAccount} disabled={isDeleting} style={styles.textAction}>
            <ThemedText type="small" style={styles.destructive}>
              {isDeleting ? 'Deleting account…' : 'Delete account'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  header: {
    paddingTop: Spacing.three,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  editGlyph: {
    fontSize: 16,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  editNameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  editNameAction: {
    paddingVertical: Spacing.two,
  },
  errorText: {
    color: '#E53935',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  inviteCode: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: 4,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  flex1: {
    flex: 1,
  },
  qrWrapper: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  qrCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#ffffff',
  },
  qrCaption: {
    textAlign: 'center',
  },
  shareButton: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAction: {
    paddingVertical: Spacing.one,
  },
  destructive: {
    color: '#E53935',
  },
});
