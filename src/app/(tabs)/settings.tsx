import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useHome } from '@/hooks/use-home';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const { profile, signOut } = useAuth();
  const { home, members, leaveHome } = useHome();

  if (!home) return null;

  const shareInvite = async () => {
    try {
      await Share.share({
        message: `Join our "${home.name}" list on Basket Buddy! Use invite code ${home.inviteCode} when you set up the app.`,
      });
    } catch {
      // User cancelled or the platform denied the share sheet — nothing to do.
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {home.name}
            </ThemedText>
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
              Share this code so a roommate can join your Home and see the same list.
            </ThemedText>
            <Pressable
              onPress={shareInvite}
              style={({ pressed }) => [
                styles.shareButton,
                { backgroundColor: theme.text },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="background">
                Share invite
              </ThemedText>
            </Pressable>
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

          <Pressable onPress={leaveHome} style={styles.textAction}>
            <ThemedText type="small" style={styles.destructive}>
              Leave this Home
            </ThemedText>
          </Pressable>

          <Pressable onPress={signOut} style={styles.textAction}>
            <ThemedText type="small" themeColor="textSecondary">
              Sign out
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
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  inviteCode: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
  },
  shareButton: {
    marginTop: Spacing.one,
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
