import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Friend = {
  id: string;
  username: string;
  streak_count: number;
  friendship_id: string;
  budget_percent_used: number;
};

type PendingRequest = {
  id: string;
  requester_id: string;
  username: string;
};

type SearchResult = {
  id: string;
  username: string;
  streak_count: number;
};

export default function FriendsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    fetchFriends();
    fetchPendingRequests();

    const channel = supabase
      .channel("friendships_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => {
          fetchFriends();
          fetchPendingRequests();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) setCurrentUserId(data.user.id);
  };

  const fetchFriends = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id")
      .eq("status", "accepted");

    if (error || !data) {
      setLoading(false);
      return;
    }

    const friendIds = data.map((f) =>
      f.requester_id === currentUserId ? f.addressee_id : f.requester_id,
    );
    const friendshipMap = data.reduce(
      (acc, f) => {
        const fid =
          f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
        acc[fid] = f.id;
        return acc;
      },
      {} as Record<string, string>,
    );

    if (friendIds.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, streak_count, budget_percent_used")
      .in("id", friendIds);

    if (profiles) {
      setFriends(
        profiles.map((p) => ({
          id: p.id,
          username: p.username,
          streak_count: p.streak_count ?? 0,
          friendship_id: friendshipMap[p.id],
          budget_percent_used: p.budget_percent_used ?? 0,
        })),
      );
    }
    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from("friendships")
      .select("id, requester_id")
      .eq("addressee_id", currentUserId)
      .eq("status", "pending");

    if (error || !data) return;

    const requesterIds = data.map((r) => r.requester_id);
    if (requesterIds.length === 0) {
      setPendingRequests([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", requesterIds);

    if (profiles) {
      setPendingRequests(
        data.map((r) => ({
          id: r.id,
          requester_id: r.requester_id,
          username:
            profiles.find((p) => p.id === r.requester_id)?.username ??
            "Unknown",
        })),
      );
    }
  };

  const searchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);

    const { data } = await supabase
      .from("profiles")
      .select("id, username, streak_count")
      .ilike("username", `%${query}%`)
      .neq("id", currentUserId)
      .limit(10);

    setSearchResults(data ?? []);
    setSearching(false);
  };

  const sendFriendRequest = async (addresseeId: string) => {
    await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: addresseeId,
      status: "pending",
    });
    setSearchResults((prev) => prev.filter((u) => u.id !== addresseeId));
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
  };

  const declineRequest = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
  };

  const removeFriend = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
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
            onChangeText={searchUsers}
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
                      onPress={() => sendFriendRequest(user.id)}
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
                      onPress={() => acceptRequest(req.id)}
                    >
                      <ThemedText style={styles.btnText}>Accept</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: "#ccc" }]}
                      onPress={() => declineRequest(req.id)}
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
                      onPress={() => removeFriend(friend.friendship_id)}
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
                          width:
                            `${Math.min(friend.budget_percent_used, 100)}%` as any,
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
