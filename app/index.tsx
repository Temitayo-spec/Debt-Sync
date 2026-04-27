import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import AppScreen from "../src/components/AppScreen";
import PaymentInfoSheet from "../src/components/PaymentInfoSheet";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/providers/AuthProvider";
import { useStore } from "../src/store/useStore";
import { palette, radii, shadows, typography } from "../src/theme";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const groups = useStore((s) => s.groups);
  const fetchGroups = useStore((s) => s.fetchGroups);
  const [paymentInfoOpen, setPaymentInfoOpen] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const totalMembers = groups.reduce(
    (count, group) => count + group.members.length,
    0,
  );

  return (
    <AppScreen contentContainerStyle={styles.container}>
      {/* Scrollable content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.accountChip}>
              <Text style={styles.accountChipText}>
                {user?.email ?? "Signed in"}
              </Text>
            </View>
            <View style={styles.headerButtons}>
              <Pressable
                onPress={() => setPaymentInfoOpen(true)}
                style={styles.iconButton}
              >
                <Ionicons name="card-outline" size={16} color={palette.surface} />
              </Pressable>
              <Pressable
                onPress={() => supabase.auth.signOut()}
                style={styles.signOutButton}
              >
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.eyebrow}>Shared finance, elevated</Text>
          <Text style={styles.heading}>Debt Sync</Text>
          <Text style={styles.subheading}>
            Track group spending, keep balances crystal clear, and settle up
            without awkward math.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{groups.length}</Text>
              <Text style={styles.statLabel}>Active groups</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalMembers}</Text>
              <Text style={styles.statLabel}>Members tracked</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your circles</Text>
          <Text style={styles.sectionHint}>Open a group to review balances</Text>
        </View>

        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/group/${item.id}`)}
              style={styles.groupCard}
            >
              <View style={styles.groupCardTop}>
                <View>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.memberCount}>
                    {item.members.length} members
                  </Text>
                </View>
                <View style={styles.openChip}>
                  <Text style={styles.openChipText}>Open</Text>
                </View>
              </View>
              <View style={styles.groupCardBottom}>
                <Text style={styles.groupMembers} numberOfLines={1}>
                  {item.members.join(" • ")}
                </Text>
                <Pressable
                  onPress={() => {
                    const url = Linking.createURL(`/join`, { queryParams: { code: item.inviteCode } });
                    Share.share({
                      message: `Join "${item.name}" on Debt Sync — tap the link or enter code ${item.inviteCode}\n\n${url}`,
                      url,
                    });
                  }}
                  style={styles.codeChip}
                  hitSlop={8}
                >
                  <Text style={styles.inviteCode}>{item.inviteCode}</Text>
                  <Text style={styles.copyHint}>tap to invite</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Get started</Text>
              <Text style={styles.emptyText}>
                Track shared expenses with friends, family, or colleagues in three steps.
              </Text>

              <View style={styles.steps}>
                <View style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>1</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepTitle}>Set up your profile</Text>
                    <Text style={styles.stepDesc}>
                      Tap the card icon above to add your name and bank details so others can pay you.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepDivider} />

                <View style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>2</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepTitle}>Create or join a group</Text>
                    <Text style={styles.stepDesc}>
                      Create a new group and share the invite code, or paste one you received.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepDivider} />

                <View style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>3</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepTitle}>Log expenses & settle</Text>
                    <Text style={styles.stepDesc}>
                      Add expenses as they happen. Debt Sync calculates who owes what and shows bank details for quick transfers.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          }
        />
      </ScrollView>

      {/* Sticky bottom buttons */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => router.push("/create-group")}
          style={[styles.button, styles.buttonFlex]}
        >
          <Text style={styles.buttonText}>Create Group</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/join")}
          style={[styles.secondaryButton, styles.buttonFlex]}
        >
          <Text style={styles.secondaryButtonText}>Join Group</Text>
        </Pressable>
      </View>
      {user && (
        <PaymentInfoSheet
          visible={paymentInfoOpen}
          userId={user.id}
          onClose={() => setPaymentInfoOpen(false)}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  heroCard: {
    backgroundColor: palette.ink,
    borderRadius: radii.lg,
    padding: 24,
    marginTop: 6,
    marginBottom: 28,
    ...shadows.card,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  accountChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  accountChipText: {
    fontFamily: typography.body,
    fontSize: 12,
    color: "#D8D1C7",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  iconButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signOutText: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    color: palette.surface,
  },
  eyebrow: {
    fontFamily: typography.bodyMedium,
    color: palette.accentSoft,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  heading: {
    fontFamily: typography.display,
    fontSize: 38,
    lineHeight: 42,
    color: palette.surface,
    marginBottom: 12,
  },
  subheading: {
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: "#D8D1C7",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.md,
    padding: 16,
  },
  statValue: {
    fontFamily: typography.display,
    fontSize: 28,
    color: palette.surface,
    marginBottom: 6,
  },
  statLabel: {
    fontFamily: typography.body,
    fontSize: 13,
    color: "#D8D1C7",
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: typography.display,
    fontSize: 30,
    color: palette.ink,
  },
  sectionHint: {
    fontFamily: typography.body,
    fontSize: 14,
    color: palette.inkSoft,
    marginTop: 4,
  },
  groupCard: {
    backgroundColor: palette.surface,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    marginBottom: 14,
    ...shadows.card,
  },
  groupCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupName: {
    fontFamily: typography.bodyMedium,
    fontSize: 18,
    color: palette.ink,
  },
  memberCount: {
    fontSize: 14,
    fontFamily: typography.body,
    color: palette.inkSoft,
    marginTop: 6,
  },
  openChip: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  openChipText: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    color: palette.accent,
    letterSpacing: 0.3,
  },
  groupCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
  },
  groupMembers: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkFaint,
    flex: 1,
  },
  codeChip: {
    alignItems: "flex-end",
  },
  inviteCode: {
    fontFamily: typography.display,
    fontSize: 13,
    color: palette.accent,
    letterSpacing: 2,
  },
  copyHint: {
    fontFamily: typography.body,
    fontSize: 10,
    color: palette.inkFaint,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
  },
  emptyTitle: {
    fontFamily: typography.display,
    fontSize: 24,
    color: palette.ink,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSoft,
    marginBottom: 20,
  },
  steps: {
    gap: 0,
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  stepDivider: {
    height: 16,
    width: 1,
    backgroundColor: palette.line,
    marginLeft: 16,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumText: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.surface,
  },
  stepBody: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 4,
  },
  stepTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.ink,
    marginBottom: 4,
  },
  stepDesc: {
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSoft,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: palette.background,
  },
  button: {
    backgroundColor: palette.accent,
    padding: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    ...shadows.card,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonText: {
    color: palette.surface,
    fontFamily: typography.bodyMedium,
    fontSize: 16,
  },
  secondaryButton: {
    padding: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    ...shadows.card,
  },
  secondaryButtonText: {
    color: palette.ink,
    fontFamily: typography.bodyMedium,
    fontSize: 16,
  },
});
