import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import {
  acceptFriendRequest,
  removeFriendship,
  searchUsers,
  sendFriendRequest,
  useFriends,
  type FriendSearchResult,
} from "@/hooks/data/use-friends";
import { useTheme } from "@/hooks/use-theme";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FriendsScreen() {
  const colors = useTheme();
  const { user } = useCurrentUser();
  const { friends, pendingRequests, loading, refetch } = useFriends(user?.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSearchResults(await searchUsers(query, user?.id));
    setSearching(false);
  };

  const handleSendRequest = async (addresseeId: string) => {
    if (!user) return;
    await sendFriendRequest(user.id, addresseeId);
    setSearchResults((prev) => prev.filter((u) => u.id !== addresseeId));
  };

  const handleAccept = async (friendshipId: string) => {
    await acceptFriendRequest(friendshipId);
    refetch();
  };

  const handleDecline = async (friendshipId: string) => {
    await removeFriendship(friendshipId);
    refetch();
  };

  const handleRemove = async (friendshipId: string) => {
    await removeFriendship(friendshipId);
    refetch();
  };

  const alreadyFriend = (userId: string) =>
    friends.some((f) => f.id === userId);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText
              style={{ color: colors.backgroundElement, fontSize: 16 }}
            >
              ← Back
            </ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={{ color: colors.backgroundElement }}>
            Friends
          </ThemedText>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.backgroundElement,
                color: colors.backgroundElement,
              },
            ]}
            placeholder="Search users..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />

          {searching && <ActivityIndicator color={colors.backgroundElement} />}

          {searchResults.length > 0 && (
            <View style={styles.section}>
              <ThemedText
                style={[
                  styles.sectionLabel,
                  { color: colors.backgroundElement },
                ]}
              >
                Results
              </ThemedText>
              {searchResults.map((user) => (
                <View
                  key={user.id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.backgroundElement + "15" },
                  ]}
                >
                  <View>
                    <ThemedText
                      style={[styles.name, { color: colors.backgroundElement }]}
                    >
                      {user.username}
                    </ThemedText>
                    <ThemedText
                      style={[styles.streak, { color: colors.textSecondary }]}
                    >
                      🔥 {user.streak_count ?? 0} day streak
                    </ThemedText>
                  </View>
                  {!alreadyFriend(user.id) && (
                    <TouchableOpacity
                      style={[
                        styles.btn,
                        { backgroundColor: colors.backgroundElement },
                      ]}
                      onPress={() => handleSendRequest(user.id)}
                    >
                      <ThemedText style={styles.btnText}>Add</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {pendingRequests.length > 0 && (
            <View style={styles.section}>
              <ThemedText
                style={[
                  styles.sectionLabel,
                  { color: colors.backgroundElement },
                ]}
              >
                Friend Requests
              </ThemedText>
              {pendingRequests.map((req) => (
                <View
                  key={req.id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.backgroundElement + "15" },
                  ]}
                >
                  <ThemedText
                    style={[styles.name, { color: colors.backgroundElement }]}
                  >
                    {req.username}
                  </ThemedText>
                  <View style={styles.row}>
                    <TouchableOpacity
                      style={[
                        styles.btn,
                        { backgroundColor: colors.backgroundElement },
                      ]}
                      onPress={() => handleAccept(req.id)}
                    >
                      <ThemedText style={styles.btnText}>Accept</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: "#ccc" }]}
                      onPress={() => handleDecline(req.id)}
                    >
                      <ThemedText style={[styles.btnText, { color: "#333" }]}>
                        Decline
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: colors.backgroundElement }]}
            >
              Friends
            </ThemedText>
            {loading ? (
              <ActivityIndicator color={colors.backgroundElement} />
            ) : friends.length === 0 ? (
              <ThemedText style={{ color: colors.textSecondary }}>
                No friends yet — search for someone to add!
              </ThemedText>
            ) : (
              friends.map((friend) => (
                <View
                  key={friend.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.backgroundElement + "15",
                      flexDirection: "column",
                      alignItems: "stretch",
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View>
                      <ThemedText
                        style={[
                          styles.name,
                          { color: colors.backgroundElement },
                        ]}
                      >
                        {friend.username}
                      </ThemedText>
                      <ThemedText
                        style={[styles.streak, { color: colors.textSecondary }]}
                      >
                        🔥 {friend.streak_count} day streak
                      </ThemedText>
                    </View>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: "#e55" }]}
                      onPress={() => handleRemove(friend.friendship_id)}
                    >
                      <ThemedText style={styles.btnText}>Remove</ThemedText>
                    </TouchableOpacity>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <ThemedText
                      style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      Budget used: {friend.budget_percent_used}%
                    </ThemedText>
                    <View
                      style={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#e0e0e0",
                      }}
                    >
                      <View
                        style={{
                          height: 6,
                          borderRadius: 3,
                          width: `${Math.min(friend.budget_percent_used, 100)}%` as `${number}%`,
                          backgroundColor:
                            friend.budget_percent_used > 85
                              ? "#e55"
                              : colors.backgroundElement,
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
  section: { gap: Spacing.two },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: 12,
  },
  name: { fontSize: 16, fontWeight: "600" },
  streak: { fontSize: 13, marginTop: 2 },
  row: { flexDirection: "row", gap: Spacing.two },
  btn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
