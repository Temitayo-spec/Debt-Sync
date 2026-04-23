import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../src/store/useStore";

export default function Home() {
  const router = useRouter();
  const groups = useStore((s) => s.groups);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Groups</Text>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/group/${item.id}`)}
            style={styles.groupCard}
          >
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.memberCount}>
              {item.members.length} members
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No groups yet. Create one.</Text>
        }
      />

      <Pressable
        onPress={() => router.push("/create-group")}
        style={styles.button}
      >
        <Text style={styles.buttonText}>+ Create Group</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  heading: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
  },
  groupCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    marginBottom: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
  },
  memberCount: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  empty: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 40,
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
