import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Comment, Expense } from "../lib/settlement";
import { timeAgo } from "../lib/settlement";
import { useStore } from "../store/useStore";
import { palette, radii, shadows, typography } from "../theme";

interface Props {
  visible: boolean;
  expense: Expense | null;
  groupId: string;
  comments: Comment[];
  currentUserId: string;
  onClose: () => void;
}

export default function CommentsSheet({
  visible,
  expense,
  groupId,
  comments,
  currentUserId,
  onClose,
}: Props) {
  const addComment = useStore((s) => s.addComment);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const expenseComments = comments.filter((c) => c.expenseId === expense?.id);

  const handleSend = async () => {
    if (!text.trim() || !expense) return;
    setSending(true);
    await addComment(groupId, expense.id, text);
    setText("");
    setSending(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.heading} numberOfLines={1}>
                {expense?.title ?? "Comments"}
              </Text>
              <Text style={styles.subheading}>
                ₦{expense?.amount.toLocaleString()} · {expense?.paidBy} paid
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <FlatList
            data={expenseComments}
            keyExtractor={(c) => c.id}
            style={styles.list}
            contentContainerStyle={expenseComments.length === 0 ? styles.emptyContainer : styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubble-outline" size={32} color={palette.line} />
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptyHint}>Be the first to say something.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.userId === currentUserId;
              return (
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  {!isMe && (
                    <Text style={styles.bubbleAuthor}>{item.authorName}</Text>
                  )}
                  <Text style={isMe ? styles.bubbleTextMe : styles.bubbleText}>
                    {item.body}
                  </Text>
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
              );
            }}
          />

          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="Add a comment…"
              placeholderTextColor={palette.inkFaint}
              style={styles.input}
              multiline
              maxLength={300}
              returnKeyType="default"
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
            >
              <Ionicons name="send" size={16} color={palette.surface} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: "82%",
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  heading: {
    fontFamily: typography.display,
    fontSize: 20,
    color: palette.ink,
  },
  subheading: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkSoft,
    marginTop: 2,
  },
  closeText: {
    fontSize: 18,
    color: palette.inkSoft,
    paddingHorizontal: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
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
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: palette.ink,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: "flex-start",
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.line,
    borderBottomLeftRadius: 4,
  },
  bubbleAuthor: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: palette.accent,
    marginBottom: 4,
  },
  bubbleText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: palette.ink,
    lineHeight: 20,
  },
  bubbleTextMe: {
    fontFamily: typography.body,
    fontSize: 14,
    color: palette.surface,
    lineHeight: 20,
  },
  bubbleTime: {
    fontFamily: typography.body,
    fontSize: 10,
    color: palette.inkFaint,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  bubbleTimeMe: {
    color: "rgba(255,255,255,0.45)",
    alignSelf: "flex-end",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: palette.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: typography.body,
    color: palette.ink,
    backgroundColor: palette.surfaceMuted,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  sendButtonDisabled: {
    backgroundColor: palette.inkFaint,
  },
});
