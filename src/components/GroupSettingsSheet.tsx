import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Group, useStore } from "../store/useStore";
import { palette, radii, shadows, typography } from "../theme";

interface Props {
  visible: boolean;
  group: Group;
  currentUserId: string;
  onClose: () => void;
  onLeaveOrDelete: () => void;
}

export default function GroupSettingsSheet({
  visible,
  group,
  currentUserId,
  onClose,
  onLeaveOrDelete,
}: Props) {
  const renameGroup = useStore((s) => s.renameGroup);
  const removeGroupMember = useStore((s) => s.removeGroupMember);
  const leaveGroup = useStore((s) => s.leaveGroup);
  const deleteGroup = useStore((s) => s.deleteGroup);

  const [nameValue, setNameValue] = useState(group.name);
  const [renaming, setRenaming] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = group.createdBy === currentUserId;

  const handleRename = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === group.name) {
      setRenaming(false);
      return;
    }
    setSaving(true);
    await renameGroup(group.id, trimmed);
    setSaving(false);
    setRenaming(false);
  };

  const handleRemoveMember = (memberName: string) => {
    const memberId = group.memberIds[memberName];
    if (!memberId) return;
    Alert.alert(
      `Remove ${memberName}?`,
      "They will be removed from the group. Their expenses remain.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeGroupMember(group.id, memberId, memberName),
        },
      ],
    );
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave group?",
      "You will no longer have access to this group.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            await leaveGroup(group.id);
            onLeaveOrDelete();
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete group?",
      "This permanently deletes the group, all expenses, and settlements. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteGroup(group.id);
            onLeaveOrDelete();
          },
        },
      ],
    );
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
            <Text style={styles.heading}>Group Settings</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Group name */}
            <Text style={styles.label}>Group Name</Text>
            {renaming ? (
              <View style={styles.renameRow}>
                <TextInput
                  value={nameValue}
                  onChangeText={setNameValue}
                  style={[styles.input, { flex: 1 }]}
                  autoFocus
                  onSubmitEditing={handleRename}
                  returnKeyType="done"
                  placeholder="Group name"
                  placeholderTextColor={palette.inkFaint}
                />
                <Pressable
                  onPress={handleRename}
                  style={[styles.saveChip, saving && styles.saveChipDisabled]}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={palette.surface} />
                  ) : (
                    <Text style={styles.saveChipText}>Save</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.namePressable} onPress={() => { setNameValue(group.name); setRenaming(true); }}>
                <Text style={styles.nameText}>{group.name}</Text>
                {isOwner && (
                  <Ionicons name="pencil-outline" size={15} color={palette.inkSoft} />
                )}
              </Pressable>
            )}

            {/* Members */}
            <Text style={[styles.label, { marginTop: 8 }]}>Members</Text>
            <View style={styles.membersList}>
              {group.members.map((member) => {
                const memberId = group.memberIds[member];
                const isCurrentUser = memberId === currentUserId;
                const isCreator = memberId === group.createdBy;
                const canRemove = isOwner && !isCurrentUser;

                return (
                  <View key={member} style={styles.memberRow}>
                    <View style={styles.memberLeft}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{member.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={styles.memberName}>
                          {member}
                          {isCurrentUser ? "  (you)" : ""}
                        </Text>
                        {isCreator && (
                          <Text style={styles.memberRole}>Owner</Text>
                        )}
                      </View>
                    </View>
                    {canRemove && (
                      <Pressable onPress={() => handleRemoveMember(member)} hitSlop={10}>
                        <Ionicons name="remove-circle-outline" size={20} color={palette.negative} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Danger zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerLabel}>Danger Zone</Text>

              {!isOwner && (
                <Pressable onPress={handleLeave} style={styles.dangerButton}>
                  <Ionicons name="exit-outline" size={17} color={palette.negative} />
                  <Text style={styles.dangerButtonText}>Leave Group</Text>
                </Pressable>
              )}

              {isOwner && (
                <Pressable onPress={handleDelete} style={styles.dangerButton}>
                  <Ionicons name="trash-outline" size={17} color={palette.negative} />
                  <Text style={styles.dangerButtonText}>Delete Group</Text>
                </Pressable>
              )}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    maxHeight: "80%",
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
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: palette.inkSoft,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  renameRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: typography.body,
    color: palette.ink,
    backgroundColor: palette.surfaceMuted,
  },
  saveChip: {
    backgroundColor: palette.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.pill,
    minWidth: 64,
    alignItems: "center",
    ...shadows.card,
  },
  saveChipDisabled: {
    backgroundColor: palette.inkFaint,
  },
  saveChipText: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.surface,
  },
  namePressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: palette.surfaceMuted,
    marginBottom: 20,
  },
  nameText: {
    fontFamily: typography.body,
    fontSize: 16,
    color: palette.ink,
  },
  membersList: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    overflow: "hidden",
    marginBottom: 24,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    backgroundColor: palette.surface,
  },
  memberLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.ink,
  },
  memberName: {
    fontFamily: typography.bodyMedium,
    fontSize: 15,
    color: palette.ink,
  },
  memberRole: {
    fontFamily: typography.body,
    fontSize: 12,
    color: palette.accent,
    marginTop: 2,
  },
  dangerZone: {
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)",
    borderRadius: radii.md,
    overflow: "hidden",
    marginBottom: 8,
  },
  dangerLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: palette.negative,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(220, 38, 38, 0.15)",
  },
  dangerButtonText: {
    fontFamily: typography.bodyMedium,
    fontSize: 15,
    color: palette.negative,
  },
});
