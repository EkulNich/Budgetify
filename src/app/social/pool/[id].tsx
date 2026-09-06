import { AddExpenseModal } from "@/components/pool/add-expense-modal";
import { InviteMemberModal } from "@/components/pool/invite-member-modal";
import { PoolExpenseRow } from "@/components/pool/pool-expense-row";
import { PoolHeader } from "@/components/pool/pool-header";
import { RenamePoolModal } from "@/components/pool/rename-pool-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useAcceptedFriendProfiles, usePool } from "@/hooks/data/use-pool";
import type { PoolExpense } from "@/hooks/data/use-pool-expenses";
import { usePoolExpenses } from "@/hooks/data/use-pool-expenses";
import type { MemberBalance } from "@/hooks/data/use-pool-balances";
import { usePoolBalances } from "@/hooks/data/use-pool-balances";
import { usePoolMembers } from "@/hooks/data/use-pool-members";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import type { CategoryKey } from "@/constants/categories";
import { useTheme } from "@/hooks/use-theme";
import { formatCurrency } from "@/lib/format";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PoolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const poolId = Number(id);
  const colors = useTheme();
  const { user } = useCurrentUser();

  const { pool, loading, rename } = usePool(poolId);
  const { members, invite, leave, refetch: refetchMembers } =
    usePoolMembers(poolId);
  const { expenses, addExpense, deleteExpense } = usePoolExpenses(poolId);
  const {
    balances,
    settleUp,
    refetch: refetchBalances,
  } = usePoolBalances(poolId, user?.id);
  const { friends } = useAcceptedFriendProfiles(user?.id);
  const { convert } = useExchangeRates();
  const currency = pool?.currency ?? "SGD";

  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);

  const isOwner = pool?.created_by === user?.id;

  const handleAddExpense = async (input: {
    description: string;
    amount: number;
    currency: string;
    category: CategoryKey;
    targets: string[];
  }) => {
    if (!user) return;
    await addExpense({ userId: user.id, ...input });
    await Promise.all([refetchMembers(), refetchBalances()]);
  };

  const handleDeleteExpense = async (expense: PoolExpense) => {
    await deleteExpense(expense, pool?.name ?? "Group Pool");
    await Promise.all([refetchMembers(), refetchBalances()]);
  };

  const handleInvite = async (friendId: string) => {
    const alreadyMember = members.some((m) => m.user_id === friendId);
    if (alreadyMember) {
      Alert.alert("Already a member");
      return;
    }
    await invite(friendId, pool?.pool_limit ?? 0);
    setInviteModalVisible(false);
  };

  const handleSettleUp = (balance: MemberBalance) => {
    const amountText = formatCurrency(balance.amount, currency);
    Alert.alert(
      "Settle Up",
      `Mark ${balance.username}'s ${amountText} as paid back to you?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await settleUp(balance, currency);
            } catch (error) {
              Alert.alert("Error", (error as Error).message);
            }
          },
        },
      ],
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          if (!user) return;
          await leave(user.id);
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
          <PoolHeader
            name={pool?.name}
            canRename={isOwner}
            colors={colors}
            onBack={() => router.back()}
            onRenamePress={() => setRenameModalVisible(true)}
          />

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
                style={[styles.sectionLabel, { color: colors.backgroundElement }]}
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
                  {formatCurrency(totalSpent, currency)}
                </ThemedText>
                <ThemedText style={{ color: "#888", fontSize: 16 }}>
                  {" "}
                  / {pool ? formatCurrency(pool.pool_limit, currency) : "0.00"}
                </ThemedText>
              </View>
              <View style={[styles.progressBg, { marginTop: Spacing.two }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress * 100}%` as `${number}%`,
                      backgroundColor:
                        progress > 0.85 ? "#e55" : colors.backgroundElement,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Balances */}
            {balances.length > 0 && (
              <View style={styles.section}>
                <ThemedText
                  style={[styles.sectionLabel, { color: colors.backgroundElement }]}
                >
                  Balances
                </ThemedText>
                {balances.map((balance) => {
                  const theyOweYou = balance.amount > 0;
                  return (
                    <View
                      key={balance.userId}
                      style={[
                        styles.card,
                        { backgroundColor: colors.backgroundElement + "15" },
                      ]}
                    >
                      <View>
                        <ThemedText
                          style={{ color: colors.backgroundElement, fontWeight: "600" }}
                        >
                          {theyOweYou
                            ? `${balance.username} owes you`
                            : `You owe ${balance.username}`}
                        </ThemedText>
                        <ThemedText
                          style={{
                            color: theyOweYou ? "#2D612A" : "#C0392B",
                            fontWeight: "700",
                            fontSize: 16,
                          }}
                        >
                          {formatCurrency(Math.abs(balance.amount), currency)}
                        </ThemedText>
                      </View>
                      {theyOweYou && (
                        <TouchableOpacity
                          style={[
                            styles.settleBtn,
                            { borderColor: colors.backgroundElement },
                          ]}
                          onPress={() => handleSettleUp(balance)}
                        >
                          <ThemedText
                            style={{ color: colors.backgroundElement, fontWeight: "600", fontSize: 13 }}
                          >
                            Settle Up
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Members */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <ThemedText
                  style={[styles.sectionLabel, { color: colors.backgroundElement }]}
                >
                  Members
                </ThemedText>
                {isOwner && (
                  <TouchableOpacity onPress={() => setInviteModalVisible(true)}>
                    <ThemedText
                      style={{ color: colors.backgroundElement, fontWeight: "600" }}
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
                    style={{ color: colors.backgroundElement, fontWeight: "600" }}
                  >
                    {m.username}
                  </ThemedText>
                  <ThemedText style={{ color: "#888", fontSize: 13 }}>
                    Spent: {formatCurrency(m.amount_spent, currency)}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* Expenses */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <ThemedText
                  style={[styles.sectionLabel, { color: colors.backgroundElement }]}
                >
                  Expenses
                </ThemedText>
                <TouchableOpacity onPress={() => setExpenseModalVisible(true)}>
                  <ThemedText
                    style={{ color: colors.backgroundElement, fontWeight: "600" }}
                  >
                    + Add
                  </ThemedText>
                </TouchableOpacity>
              </View>
              {expenses.length === 0 ? (
                <ThemedText style={{ color: "#888" }}>No expenses yet</ThemedText>
              ) : (
                expenses.map((e) => (
                  <PoolExpenseRow
                    key={e.id}
                    expense={e}
                    onDelete={handleDeleteExpense}
                  />
                ))
              )}
            </View>

            {/* Leave Group */}
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
              <ThemedText style={{ color: "#e55", fontWeight: "600", fontSize: 15 }}>
                Leave Group
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>

          <AddExpenseModal
            visible={expenseModalVisible}
            members={members}
            colors={colors}
            defaultCurrency={currency}
            convert={convert}
            onClose={() => setExpenseModalVisible(false)}
            onSubmit={handleAddExpense}
          />

          <RenamePoolModal
            visible={renameModalVisible}
            currentName={pool?.name}
            colors={colors}
            onClose={() => setRenameModalVisible(false)}
            onSubmit={rename}
          />

          <InviteMemberModal
            visible={inviteModalVisible}
            friends={friends}
            members={members}
            colors={colors}
            onClose={() => setInviteModalVisible(false)}
            onInvite={handleInvite}
          />
        </SafeAreaView>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
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
  progressBg: { height: 8, borderRadius: 4, backgroundColor: "#e0e0e0" },
  progressFill: { height: 8, borderRadius: 4 },
  settleBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  leaveBtn: {
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e55",
  },
});
