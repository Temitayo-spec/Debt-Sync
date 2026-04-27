import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getCategoryIcon, getActivityFeed, timeAgo } from "../lib/settlement";
import { Group } from "../store/useStore";
import { palette, radii, shadows, typography } from "../theme";

interface Props {
  visible: boolean;
  groups: Group[];
  lastSeenAt: string;
  onClose: () => void;
}

export default function NotificationsSheet({ visible, groups, lastSeenAt, onClose }: Props) {
  // collect all activity across every group, most recent first
  const allItems = groups
    .flatMap((g) => {
      const feed = getActivityFeed(g.expenses, g.settlements);
      return feed.map((item) => ({ ...item, groupName: g.name }));
    })
    .sort((a, b) => {
      const aTime = a.kind === "expense" ? a.data.createdAt : a.data.createdAt;
      const bTime = b.kind === "expense" ? b.data.createdAt : b.data.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    })
    .slice(0, 50);

  // also pull comments across all groups
  const allComments = groups
    .flatMap((g) =>
      g.comments.map((c) => ({ ...c, groupName: g.name })),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  // merge and sort everything
  type AnyItem =
    | { kind: "expense" | "settlement"; createdAt: string; groupName: string; data: any }
    | { kind: "comment"; createdAt: string; groupName: string; data: any };

  const merged: AnyItem[] = [
    ...allItems.map((i) => ({
      kind: i.kind as "expense" | "settlement",
      createdAt: i.data.createdAt,
      groupName: i.groupName,
      data: i.data,
    })),
    ...allComments.map((c) => ({
      kind: "comment" as const,
      createdAt: c.createdAt,
      groupName: c.groupName,
      data: c,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.heading}>Activity</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {merged.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="notifications-outline" size={36} color={palette.line} />
                <Text style={styles.emptyText}>No activity yet</Text>
                <Text style={styles.emptyHint}>Events from all your groups appear here.</Text>
              </View>
            ) : (
              merged.map((item, index) => {
                const isNew = new Date(item.createdAt) > new Date(lastSeenAt);

                if (item.kind === "expense") {
                  return (
                    <View key={`exp-${item.data.id}`} style={[styles.row, isNew && styles.rowNew]}>
                      <View style={styles.iconWrap}>
                        <Ionicons
                          name={getCategoryIcon(item.data.category) as any}
                          size={17}
                          color={palette.accent}
                        />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{item.data.title}</Text>
                        <Text style={styles.rowSub}>
                          {item.data.paidBy} paid · {item.groupName}
                        </Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={styles.rowAmount}>₦{item.data.amount.toLocaleString()}</Text>
                        <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      {isNew && <View style={styles.newDot} />}
                    </View>
                  );
                }

                if (item.kind === "settlement") {
                  return (
                    <View key={`set-${item.data.id}`} style={[styles.row, isNew && styles.rowNew]}>
                      <View style={[styles.iconWrap, styles.iconWrapGreen]}>
                        <Ionicons name="checkmark-circle-outline" size={17} color={palette.positive} />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {item.data.from} settled up
                        </Text>
                        <Text style={styles.rowSub}>with {item.data.to} · {item.groupName}</Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={[styles.rowAmount, { color: palette.positive }]}>
                          ₦{item.data.amount.toLocaleString()}
                        </Text>
                        <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      {isNew && <View style={styles.newDot} />}
                    </View>
                  );
                }

                // comment
                return (
                  <View key={`cmt-${item.data.id}`} style={[styles.row, isNew && styles.rowNew]}>
                    <View style={[styles.iconWrap, styles.iconWrapComment]}>
                      <Ionicons name="chatbubble-outline" size={15} color={palette.inkSoft} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.data.authorName} commented
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        "{item.data.body}" · {item.groupName}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
                    </View>
                    {isNew && <View style={styles.newDot} />}
                  </View>
                );
              })
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(28, 25, 23, 0.32)",
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: 16,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
  },
  handle: {
    width: 54,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: palette.line,
    alignSelf: "center",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  heading: {
    fontFamily: typography.display,
    fontSize: 22,
    color: palette.ink,
  },
  closeText: {
    fontSize: 18,
    color: palette.inkSoft,
    paddingHorizontal: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontFamily: typography.bodyMedium,
    fontSize: 16,
    color: palette.inkSoft,
  },
  emptyHint: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkFaint,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    gap: 12,
    position: "relative",
  },
  rowNew: {
    backgroundColor: "rgba(184, 142, 79, 0.06)",
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconWrapGreen: {
    borderColor: "rgba(34, 197, 94, 0.2)",
    backgroundColor: "rgba(34, 197, 94, 0.06)",
  },
  iconWrapComment: {
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.ink,
  },
  rowSub: {
    fontFamily: typography.body,
    fontSize: 12,
    color: palette.inkSoft,
    marginTop: 2,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  rowAmount: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: palette.ink,
  },
  rowTime: {
    fontFamily: typography.body,
    fontSize: 11,
    color: palette.inkFaint,
  },
  newDot: {
    position: "absolute",
    right: 0,
    top: "50%",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.accent,
    marginTop: -3.5,
  },
});
