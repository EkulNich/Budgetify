import { Ionicons } from "@expo/vector-icons";
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
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY_GREEN = "#2D612A";
const NEGATIVE_RED = "#C0392B";
const TEXT_DARK = "#23262B";
const TEXT_MUTED = "#9AA0A8";

export default function FriendsScreen() {
  const { user } = useCurrentUser();
  const { friends, pendingRequests, loading, refetch } = useFriends(user?.id);

  const [filterQuery, setFilterQuery] = useState("");
  const filteredFriends = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return friends;
    return friends.filter((f) => f.username.toLowerCase().includes(query));
  }, [friends, filterQuery]);

  const [addVisible, setAddVisible] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<FriendSearchResult[]>([]);
  const [addSearching, setAddSearching] = useState(false);

  const handleAddSearch = async (query: string) => {
    setAddQuery(query);
    if (query.trim().length < 2) {
      setAddResults([]);
      return;
    }
    setAddSearching(true);
    setAddResults(await searchUsers(query, user?.id));
    setAddSearching(false);
  };

  const openAddFriends = () => {
    setAddQuery("");
    setAddResults([]);
    setAddVisible(true);
  };

  const handleSendRequest = async (addresseeId: string) => {
    if (!user) return;
    try {
      await sendFriendRequest(user.id, addresseeId);
      setAddResults((prev) => prev.filter((u) => u.id !== addresseeId));
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId);
      refetch();
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleDecline = async (friendshipId: string) => {
    try {
      await removeFriendship(friendshipId);
      refetch();
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleRemove = async (friendshipId: string) => {
    try {
      await removeFriendship(friendshipId);
      refetch();
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const alreadyFriend = (userId: string) =>
    friends.some((f) => f.id === userId);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={PRIMARY_GREEN} />
              <ThemedText style={styles.backText}>Back</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addFriendsBtn} onPress={openAddFriends}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={TEXT_MUTED} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your friends..."
              placeholderTextColor={TEXT_MUTED}
              value={filterQuery}
              onChangeText={setFilterQuery}
            />
          </View>

          {pendingRequests.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Friend Requests</ThemedText>
              {pendingRequests.map((req) => (
                <View key={req.id} style={styles.simpleCard}>
                  <View style={[styles.avatar, { width: 42, height: 42, borderRadius: 21 }]}>
                    <ThemedText style={[styles.avatarText, { fontSize: 15 }]}>
                      {req.username.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.friendName}>{req.username}</ThemedText>
                  </View>
                  <View style={styles.row}>
                    <TouchableOpacity style={styles.addBtn} onPress={() => handleAccept(req.id)}>
                      <ThemedText style={styles.addBtnText}>Accept</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleDecline(req.id)}
                    >
                      <ThemedText style={styles.removeBtnText}>Decline</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText style={styles.sectionTitle}>Your Friends</ThemedText>
              <ThemedText style={styles.sectionCount}>
                {friends.length} {friends.length === 1 ? "friend" : "friends"}
              </ThemedText>
            </View>

            {loading ? (
              <ActivityIndicator color={PRIMARY_GREEN} />
            ) : friends.length === 0 ? (
              <ThemedText style={styles.emptyText}>
                No friends yet — tap + to add someone!
              </ThemedText>
            ) : filteredFriends.length === 0 ? (
              <ThemedText style={styles.emptyText}>
                No friends match "{filterQuery}".
              </ThemedText>
            ) : (
              filteredFriends.map((friend) => (
                <View key={friend.id} style={styles.friendCard}>
                  <View style={styles.friendTopRow}>
                    <View style={styles.avatar}>
                      <ThemedText style={styles.avatarText}>
                        {friend.username.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.friendName}>{friend.username}</ThemedText>
                      {!!friend.bio && (
                        <ThemedText style={styles.friendBio}>{friend.bio}</ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemove(friend.friendship_id)}
                    >
                      <ThemedText style={styles.removeBtnText}>Remove</ThemedText>
                    </TouchableOpacity>
                  </View>

                  <ThemedText style={styles.streakText}>
                    🔥 {friend.streak_count} day streak
                  </ThemedText>

                  <ThemedText style={styles.budgetLabel}>
                    Budget used: <ThemedText style={styles.budgetPercent}>{friend.budget_percent_used}%</ThemedText>
                  </ThemedText>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(friend.budget_percent_used, 100)}%` as `${number}%`,
                          backgroundColor:
                            friend.budget_percent_used > 85 ? NEGATIVE_RED : PRIMARY_GREEN,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <Modal visible={addVisible} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <ThemedText style={styles.modalTitle}>Add Friends</ThemedText>
                <TouchableOpacity onPress={() => setAddVisible(false)}>
                  <Ionicons name="close" size={24} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color={TEXT_MUTED} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users..."
                  placeholderTextColor={TEXT_MUTED}
                  value={addQuery}
                  onChangeText={handleAddSearch}
                  autoFocus
                />
              </View>

              {addSearching && <ActivityIndicator color={PRIMARY_GREEN} />}

              <ScrollView
                style={styles.modalResults}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {addResults.map((result) => {
                  const isFriend = alreadyFriend(result.id);
                  return (
                    <View key={result.id} style={styles.simpleCard}>
                      <View style={[styles.avatar, { width: 42, height: 42, borderRadius: 21 }]}>
                        <ThemedText style={[styles.avatarText, { fontSize: 15 }]}>
                          {result.username.charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.friendName}>{result.username}</ThemedText>
                        <ThemedText style={styles.streakText}>
                          🔥 {result.streak_count ?? 0} day streak
                        </ThemedText>
                      </View>
                      {isFriend ? (
                        <View style={styles.friendedBtn}>
                          <ThemedText style={styles.friendedBtnText}>Friended</ThemedText>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => handleSendRequest(result.id)}
                        >
                          <ThemedText style={styles.addBtnText}>Add</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_GREEN,
  },
  addFriendsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PRIMARY_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1.5,
    borderColor: PRIMARY_GREEN + "40",
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: PRIMARY_GREEN,
  },
  section: { gap: Spacing.two },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: PRIMARY_GREEN,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.one,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: PRIMARY_GREEN,
  },
  sectionCount: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  simpleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: Spacing.two,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  friendCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  friendTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIMARY_GREEN + "14",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  friendName: {
    fontSize: 17,
    fontWeight: "800",
    color: PRIMARY_GREEN,
  },
  friendBio: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  budgetLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  budgetPercent: {
    fontWeight: "800",
    color: TEXT_DARK,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "#E7E7E7",
    overflow: "hidden",
  },
  progressFill: {
    height: 7,
    borderRadius: 4,
  },
  addBtn: {
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  friendedBtn: {
    backgroundColor: "#E3E5E8",
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  friendedBtnText: {
    color: "#8A8F98",
    fontWeight: "700",
    fontSize: 13,
  },
  removeBtn: {
    borderWidth: 1.3,
    borderColor: NEGATIVE_RED + "55",
    backgroundColor: NEGATIVE_RED + "10",
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  removeBtnText: {
    color: NEGATIVE_RED,
    fontWeight: "700",
    fontSize: 13,
  },
  row: { flexDirection: "row", gap: Spacing.two },
  emptyText: {
    color: TEXT_MUTED,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#F7F8F5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
    maxHeight: "80%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: PRIMARY_GREEN,
  },
  modalResults: { gap: Spacing.two },
});
