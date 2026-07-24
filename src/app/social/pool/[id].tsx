import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import {
    GestureHandlerRootView,
    Swipeable,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

type Member = {
  user_id: string;
  username: string;
  contribution_limit: number;
  amount_spent: number;
};

type Expense = {
  id: number;
  amount: number;
  description: string;
  created_at: string;
  added_by: string;
  added_by_username: string;
  split_between: string[] | null;
  split_usernames: string[];
};

type Pool = {
  id: number;
  name: string;
  pool_limit: number;
  created_by: string;
};

function SwipeableExpense({
  expense,
  onDelete,
  colors,
}: {
  expense: Expense;
  onDelete: (expense: Expense) => void;
  colors: any;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    return (
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => {
          swipeableRef.current?.close();
          Alert.alert(
            "Delete Expense",
            expense.split_between && expense.split_between.length > 1
              ? "This will delete the expense for all members it was split between."
              : "Are you sure you want to delete this expense?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => onDelete(expense),
              },
            ],
          );
        }}
      >
        <ThemedText style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
          Delete
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const isSplit = expense.split_between && expense.split_between.length > 1;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
    >
      <View style={[styles.expenseCard, { backgroundColor: "#2D612A15" }]}>
        <View style={styles.expenseTop}>
          <ThemedText
            style={{ color: "#2D612A", fontWeight: "600", fontSize: 15 }}
          >
            {expense.description}
          </ThemedText>
          <ThemedText
            style={{ color: "#2D612A", fontWeight: "700", fontSize: 15 }}
          >
            ${expense.amount.toFixed(2)}
          </ThemedText>
        </View>
        {isSplit ? (
          <View style={styles.splitList}>
            <ThemedText
              style={{ color: "#888", fontSize: 12, marginBottom: 2 }}
            >
              Split between:
            </ThemedText>
            {expense.split_usernames.map((u, i) => (
              <ThemedText key={i} style={{ color: "#888", fontSize: 12 }}>
                • {u} — $
                {(expense.amount / expense.split_between!.length).toFixed(2)}
              </ThemedText>
            ))}
          </View>
        ) : (
          <ThemedText style={{ color: "#888", fontSize: 12 }}>
            {expense.added_by_username}
          </ThemedText>
        )}
      </View>
    </Swipeable>
  );
}

export default function PoolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [friends, setFriends] = useState<{ id: string; username: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [newPoolName, setNewPoolName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(["split"]),
  );
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchPool();
      fetchMembers();
      fetchExpenses();
      fetchFriends();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) setCurrentUserId(data.user.id);
  };

  const fetchPool = async () => {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("id", id)
      .single();
    if (data) setPool(data);
    setLoading(false);
  };

  const fetchMembers = async () => {
    const { data: memberData } = await supabase
      .from("group_members")
      .select("user_id, contribution_limit")
      .eq("group_id", id);

    if (!memberData) return;

    const userIds = memberData.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    const { data: expenseData } = await supabase
      .from("group_expenses")
      .select("split_between, amount")
      .eq("group_id", id);

    if (profiles) {
      setMembers(
        memberData.map((m) => {
          const spent =
            expenseData?.reduce((sum, e) => {
              if (!e.split_between) return sum;
              if (e.split_between.includes(m.user_id)) {
                return sum + e.amount / e.split_between.length;
              }
              return sum;
            }, 0) ?? 0;
          return {
            user_id: m.user_id,
            username:
              profiles.find((p) => p.id === m.user_id)?.username ?? "Unknown",
            contribution_limit: m.contribution_limit,
            amount_spent: spent,
          };
        }),
      );
    }
  };

  const fetchExpenses = async () => {
    const { data: expenseData } = await supabase
      .from("group_expenses")
      .select("id, amount, description, created_at, added_by, split_between")
      .eq("group_id", id)
      .order("created_at", { ascending: false });

    if (!expenseData) return;

    const allUserIds = [
      ...new Set([
        ...expenseData.map((e) => e.added_by).filter(Boolean),
        ...expenseData.flatMap((e) => e.split_between ?? []),
      ]),
    ];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", allUserIds);

    if (profiles) {
      setExpenses(
        expenseData.map((e) => ({
          id: e.id,
          amount: e.amount,
          description: e.description,
          created_at: e.created_at,
          added_by: e.added_by,
          added_by_username:
            profiles.find((p) => p.id === (e.split_between?.[0] ?? e.added_by))
              ?.username ?? "Unknown",
          split_between: e.split_between,
          split_usernames: (e.split_between ?? []).map(
            (uid: string) =>
              profiles.find((p) => p.id === uid)?.username ?? "Unknown",
          ),
        })),
      );
    }
  };

  const fetchFriends = async () => {
    const { data } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted");
    if (!data) return;
    const friendIds = data.map((f) =>
      f.requester_id === currentUserId ? f.addressee_id : f.requester_id,
    );
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", friendIds);
    setFriends(profiles ?? []);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      next.delete("split");
      if (next.has(userId)) {
        next.delete(userId);
        if (next.size === 0) next.add("split");
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSplitAll = () => setSelectedMembers(new Set(["split"]));

  const addExpense = async () => {
    if (!expenseAmount.trim() || !expenseDesc.trim()) return;
    setAdding(true);

    const amount = parseFloat(expenseAmount);
    const poolName = pool?.name ?? "Group Pool";
    const cleanDesc = expenseDesc.trim();
    const isSplitAll = selectedMembers.has("split");
    const targets = isSplitAll
      ? members.map((m) => m.user_id)
      : [...selectedMembers];
    const splitAmount = amount / targets.length;

    await supabase.from("group_expenses").insert({
      group_id: parseInt(id),
      added_by: currentUserId,
      amount,
      description: cleanDesc,
      split_between: targets,
    });

    for (const userId of targets) {
      await supabase.rpc("insert_expense_for_user", {
        p_user_id: userId,
        p_amount: splitAmount,
        p_category: poolName,
        p_description: cleanDesc,
      });
    }

    setExpenseAmount("");
    setExpenseDesc("");
    setSelectedMembers(new Set(["split"]));
    setExpenseModalVisible(false);
    setAdding(false);
    fetchExpenses();
    fetchMembers();
  };

  const deleteExpense = async (expense: Expense) => {
    await supabase.from("group_expenses").delete().eq("id", expense.id);

    const targets = expense.split_between ?? [expense.added_by];
    for (const userId of targets) {
      await supabase.rpc("delete_expense_for_user", {
        p_user_id: userId,
        p_description: expense.description,
        p_category: pool?.name ?? "Group Pool",
      });
    }

    fetchExpenses();
    fetchMembers();
  };

  const inviteMember = async (friendId: string) => {
    const alreadyMember = members.some((m) => m.user_id === friendId);
    if (alreadyMember) {
      Alert.alert("Already a member");
      return;
    }
    await supabase.from("group_members").insert({
      group_id: parseInt(id),
      user_id: friendId,
      contribution_limit: pool?.pool_limit ?? 0,
    });
    setInviteModalVisible(false);
    fetchMembers();
  };

  const renamePool = async () => {
    if (!newPoolName.trim()) return;
    const oldName = pool?.name ?? "";
    const trimmed = newPoolName.trim();

    await supabase.from("groups").update({ name: trimmed }).eq("id", id);

    const { error: renameError } = await supabase.rpc("rename_group_expenses", {
      p_old_name: oldName,
      p_new_name: trimmed,
    });
    console.log("Rename expenses error:", JSON.stringify(renameError));

    setPool((prev) => (prev ? { ...prev, name: trimmed } : prev));
    setNewPoolName("");
    setRenameModalVisible(false);
  };

  const leaveGroup = async () => {
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          await supabase
            .from("group_members")
            .delete()
            .eq("group_id", parseInt(id))
            .eq("user_id", currentUserId);
          router.back();
        },
      },
    ]);
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const progress = pool ? Math.min(totalSpent / pool.pool_limit, 1) : 0;

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2D612A" />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={{ width: 70 }}
              onPress={() => router.back()}
            >
              <ThemedText
                style={{
                  color: colors.backgroundElement,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                ← Back
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                pool?.created_by === currentUserId &&
                setRenameModalVisible(true)
              }
              style={{ flex: 1, alignItems: "center" }}
              disabled={pool?.created_by !== currentUserId}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color: colors.backgroundElement,
                  fontSize: 32,
                  fontWeight: "700",
                  textAlign: "center",
                  textDecorationLine:
                    pool?.created_by === currentUserId ? "underline" : "none",
                }}
              >
                {pool?.name}
              </Text>
            </TouchableOpacity>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Budget Progress */}
            <View
              style={[
                styles.budgetCard,
                { backgroundColor: colors.backgroundElement + "15" },
              ]}
            >
              <ThemedText
                style={[
                  styles.sectionLabel,
                  { color: colors.backgroundElement },
                ]}
              >
                Pool Budget
              </ThemedText>
              <View style={styles.budgetRow}>
                <ThemedText
                  style={{
                    color: colors.backgroundElement,
                    fontSize: 22,
                    fontWeight: "700",
                  }}
                >
                  ${totalSpent.toFixed(2)}
                </ThemedText>
                <ThemedText style={{ color: "#888", fontSize: 16 }}>
                  {" "}
                  / ${pool?.pool_limit.toFixed(2)}
                </ThemedText>
              </View>
              <View style={[styles.progressBg, { marginTop: Spacing.two }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress * 100}%` as any,
                      backgroundColor:
                        progress > 0.85 ? "#e55" : colors.backgroundElement,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Members */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <ThemedText
                  style={[
                    styles.sectionLabel,
                    { color: colors.backgroundElement },
                  ]}
                >
                  Members
                </ThemedText>
                {pool?.created_by === currentUserId && (
                  <TouchableOpacity onPress={() => setInviteModalVisible(true)}>
                    <ThemedText
                      style={{
                        color: colors.backgroundElement,
                        fontWeight: "600",
                      }}
                    >
                      + Invite
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
              {members.map((m) => (
                <View
                  key={m.user_id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.backgroundElement + "15" },
                  ]}
                >
                  <ThemedText
                    style={{
                      color: colors.backgroundElement,
                      fontWeight: "600",
                    }}
                  >
                    {m.username}
                  </ThemedText>
                  <ThemedText style={{ color: "#888", fontSize: 13 }}>
                    Spent: ${m.amount_spent.toFixed(2)}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* Expenses */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <ThemedText
                  style={[
                    styles.sectionLabel,
                    { color: colors.backgroundElement },
                  ]}
                >
                  Expenses
                </ThemedText>
                <TouchableOpacity onPress={() => setExpenseModalVisible(true)}>
                  <ThemedText
                    style={{
                      color: colors.backgroundElement,
                      fontWeight: "600",
                    }}
                  >
                    + Add
                  </ThemedText>
                </TouchableOpacity>
              </View>
              {expenses.length === 0 ? (
                <ThemedText style={{ color: "#888" }}>
                  No expenses yet
                </ThemedText>
              ) : (
                expenses.map((e) => (
                  <SwipeableExpense
                    key={e.id}
                    expense={e}
                    onDelete={deleteExpense}
                    colors={colors}
                  />
                ))
              )}
            </View>

            {/* Leave Group */}
            <TouchableOpacity style={styles.leaveBtn} onPress={leaveGroup}>
              <ThemedText
                style={{ color: "#e55", fontWeight: "600", fontSize: 15 }}
              >
                Leave Group
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>

          {/* Add Expense Modal */}
          <Modal
            visible={expenseModalVisible}
            transparent
            animationType="slide"
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalOverlay}
            >
              <View style={[styles.modalCard, { backgroundColor: "#fff" }]}>
                <ThemedText
                  style={[
                    styles.modalTitle,
                    { color: colors.backgroundElement },
                  ]}
                >
                  Add Expense
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.backgroundElement,
                      color: colors.backgroundElement,
                    },
                  ]}
                  placeholder="Description"
                  placeholderTextColor="#888"
                  value={expenseDesc}
                  onChangeText={setExpenseDesc}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.backgroundElement,
                      color: colors.backgroundElement,
                    },
                  ]}
                  placeholder="Amount ($)"
                  placeholderTextColor="#888"
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  keyboardType="numeric"
                />
                <ThemedText
                  style={{
                    color: colors.backgroundElement,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  Assign to:
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                >
                  <View style={styles.assignRow}>
                    <TouchableOpacity
                      style={[
                        styles.assignBtn,
                        { borderColor: colors.backgroundElement },
                        selectedMembers.has("split") && {
                          backgroundColor: colors.backgroundElement,
                        },
                      ]}
                      onPress={toggleSplitAll}
                    >
                      <ThemedText
                        style={{
                          color: selectedMembers.has("split")
                            ? "#fff"
                            : colors.backgroundElement,
                          fontSize: 13,
                        }}
                      >
                        Split all
                      </ThemedText>
                    </TouchableOpacity>
                    {members.map((m) => {
                      const selected = selectedMembers.has(m.user_id);
                      return (
                        <TouchableOpacity
                          key={m.user_id}
                          style={[
                            styles.assignBtn,
                            { borderColor: colors.backgroundElement },
                            selected && {
                              backgroundColor: colors.backgroundElement,
                            },
                          ]}
                          onPress={() => toggleMember(m.user_id)}
                        >
                          <ThemedText
                            style={{
                              color: selected
                                ? "#fff"
                                : colors.backgroundElement,
                              fontSize: 13,
                            }}
                          >
                            {m.username}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
                {!selectedMembers.has("split") && selectedMembers.size > 0 && (
                  <ThemedText style={{ color: "#888", fontSize: 12 }}>
                    $
                    {(
                      parseFloat(expenseAmount || "0") / selectedMembers.size
                    ).toFixed(2)}{" "}
                    each ({selectedMembers.size}{" "}
                    {selectedMembers.size === 1 ? "person" : "people"})
                  </ThemedText>
                )}
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: "#e0e0e0" }]}
                    onPress={() => setExpenseModalVisible(false)}
                  >
                    <ThemedText
                      style={{ color: "#333", fontWeight: "600", fontSize: 14 }}
                    >
                      Cancel
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      { backgroundColor: colors.backgroundElement },
                    ]}
                    onPress={addExpense}
                    disabled={adding}
                  >
                    {adding ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <ThemedText style={styles.btnText}>Add</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Rename Modal */}
          <Modal visible={renameModalVisible} transparent animationType="slide">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalOverlay}
            >
              <View style={[styles.modalCard, { backgroundColor: "#fff" }]}>
                <ThemedText
                  style={[
                    styles.modalTitle,
                    { color: colors.backgroundElement },
                  ]}
                >
                  Rename Pool
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.backgroundElement,
                      color: colors.backgroundElement,
                    },
                  ]}
                  placeholder={pool?.name ?? "New name"}
                  placeholderTextColor="#888"
                  value={newPoolName}
                  onChangeText={setNewPoolName}
                  maxLength={20}
                  autoFocus
                />
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: "#e0e0e0" }]}
                    onPress={() => setRenameModalVisible(false)}
                  >
                    <ThemedText
                      style={{ color: "#333", fontWeight: "600", fontSize: 14 }}
                    >
                      Cancel
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      { backgroundColor: colors.backgroundElement },
                    ]}
                    onPress={renamePool}
                  >
                    <ThemedText style={styles.btnText}>Save</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Invite Modal */}
          <Modal visible={inviteModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: "#fff" }]}>
                <ThemedText
                  style={[
                    styles.modalTitle,
                    { color: colors.backgroundElement },
                  ]}
                >
                  Invite a Friend
                </ThemedText>
                <ScrollView style={{ maxHeight: 300 }}>
                  {friends
                    .filter((f) => !members.some((m) => m.user_id === f.id))
                    .map((f) => (
                      <TouchableOpacity
                        key={f.id}
                        style={[
                          styles.card,
                          {
                            backgroundColor: colors.backgroundElement + "15",
                            marginBottom: Spacing.two,
                          },
                        ]}
                        onPress={() => inviteMember(f.id)}
                      >
                        <ThemedText
                          style={{
                            color: colors.backgroundElement,
                            fontWeight: "600",
                          }}
                        >
                          {f.username}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setInviteModalVisible(false)}
                >
                  <ThemedText
                    style={{ color: "#333", fontWeight: "600", fontSize: 14 }}
                  >
                    Close
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </ThemedView>
    </GestureHandlerRootView>
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
  section: { gap: Spacing.two },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  budgetCard: { borderRadius: 12, padding: Spacing.three },
  budgetRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: Spacing.one,
  },
  card: {
    borderRadius: 12,
    padding: Spacing.three,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseCard: { borderRadius: 12, padding: Spacing.three, marginBottom: 2 },
  expenseTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  splitList: { marginTop: 4, gap: 2 },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: "#e0e0e0" },
  progressFill: { height: 8, borderRadius: 4 },
  leaveBtn: {
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e55",
  },
  deleteBtn: {
    backgroundColor: "#e55",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 12,
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
  assignRow: {
    flexDirection: "row",
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  assignBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  row: { flexDirection: "row", gap: Spacing.two },
  btn: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  closeBtn: {
    backgroundColor: "#e0e0e0",
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: "center",
  },
});
