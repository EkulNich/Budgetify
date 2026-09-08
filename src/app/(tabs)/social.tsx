import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import type { NamedBalance } from "@/hooks/data/use-balances-summary";
import { useBalancesSummary } from "@/hooks/data/use-balances-summary";
import { useProfile } from "@/hooks/data/use-profile";
import { formatCurrency } from "@/lib/format";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY_GREEN = "#2D612A";
const NEGATIVE_RED = "#C0392B";
const TEXT_DARK = "#23262B";

function BalanceList({
  title,
  balances,
  currency,
  color,
  onSettle,
  expandable,
}: {
  title: string;
  balances: NamedBalance[];
  currency: string;
  color: string;
  onSettle?: (balance: NamedBalance) => void;
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (balances.length === 0) return null;

  const visible = expandable && !expanded ? balances.slice(0, 3) : balances;
  const showToggle = expandable && balances.length > 3;

  return (
    <View style={styles.owedSection}>
      <View style={styles.owedHeader}>
        <ThemedText style={styles.owedTitle}>{title}</ThemedText>
        {showToggle && (
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => setExpanded((v) => !v)}
          >
            <ThemedText style={{ color: PRIMARY_GREEN, fontWeight: "700", fontSize: 13.5 }}>
              {expanded ? "Show Less" : "See All"}
            </ThemedText>
            <Ionicons name="chevron-forward" size={13} color={PRIMARY_GREEN} />
          </TouchableOpacity>
        )}
      </View>
      <Card style={styles.owedCard}>
        {visible.map((balance, index) => (
          <View
            key={balance.userId}
            style={[
              styles.owedRow,
              index < visible.length - 1 && styles.owedRowDivider,
            ]}
          >
            <View style={styles.owedAvatar}>
              <ThemedText style={styles.owedAvatarText}>
                {balance.username.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.owedName}>{balance.username}</ThemedText>
              <ThemedText style={[styles.owedAmount, { color }]}>
                {formatCurrency(balance.amount, currency)}
              </ThemedText>
            </View>
            {onSettle && (
              <TouchableOpacity
                style={[styles.settleBtn, { borderColor: color }]}
                onPress={() => onSettle(balance)}
              >
                <ThemedText style={{ color, fontWeight: "600", fontSize: 13 }}>
                  Settle Up
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </Card>
    </View>
  );
}

export default function SocialScreen() {
  const { user } = useCurrentUser();
  const { profile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const currency = profile?.currency ?? "SGD";
  const {
    owedToYou,
    owedByYou,
    refetch: refetchBalances,
    settleAllWith,
  } = useBalancesSummary(user?.id, currency, convert);

  useFocusEffect(
    useCallback(() => {
      refetchBalances();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, currency]),
  );

  const totalOwedToYou = owedToYou.reduce((sum, b) => sum + b.amount, 0);

  const handleSettleAll = (balance: NamedBalance) => {
    Alert.alert(
      "Settle Up",
      `Mark everything ${balance.username} owes you (${formatCurrency(balance.amount, currency)}, across every shared pool) as paid back?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await settleAllWith(balance.userId);
            } catch (error) {
              Alert.alert("Error", (error as Error).message);
            }
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {owedToYou.length > 0 && (
            <View style={styles.heroCard}>
              <IconBadge color="#FFFFFF" size={52}>
                <Ionicons name="people-outline" size={26} color="#fff" />
              </IconBadge>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.heroLabel}>You're Owed</ThemedText>
                <ThemedText style={styles.heroValue}>
                  {formatCurrency(totalOwedToYou, currency)}
                </ThemedText>
                <ThemedText style={styles.heroSubtext}>
                  Across {owedToYou.length} {owedToYou.length === 1 ? "person" : "people"}
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.navSection}>
            <TouchableOpacity style={styles.navCard} onPress={() => router.push("/social/friends")}>
              <IconBadge color={PRIMARY_GREEN}>
                <Ionicons name="people-outline" size={21} color={PRIMARY_GREEN} />
              </IconBadge>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.navTitle}>Friends</ThemedText>
                <ThemedText style={styles.navSub}>View friends, streaks & requests</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4C9CE" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navCard} onPress={() => router.push("/social/pools")}>
              <IconBadge color={PRIMARY_GREEN}>
                <FontAwesome5 name="money-bill-wave" size={17} color={PRIMARY_GREEN} />
              </IconBadge>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.navTitle}>Group Pools</ThemedText>
                <ThemedText style={styles.navSub}>Shared budgets with your friends</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4C9CE" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navCard} onPress={() => router.push("/social/history")}>
              <IconBadge color={PRIMARY_GREEN}>
                <Ionicons name="receipt-outline" size={20} color={PRIMARY_GREEN} />
              </IconBadge>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.navTitle}>Settlement History</ThemedText>
                <ThemedText style={styles.navSub}>Every payment, across every pool</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4C9CE" />
            </TouchableOpacity>
          </View>

          <BalanceList
            title="People Who Owe You"
            balances={owedToYou}
            currency={currency}
            color={PRIMARY_GREEN}
            onSettle={handleSettleAll}
            expandable
          />

          <BalanceList
            title="People You Owe"
            balances={owedByYou}
            currency={currency}
            color={NEGATIVE_RED}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  heroCard: {
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 20,
    padding: Spacing.four,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  heroLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#cfe6c9",
    textTransform: "uppercase",
  },
  heroValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    marginTop: 2,
  },
  heroSubtext: {
    fontSize: 12.5,
    color: "#cfe6c9",
    marginTop: 2,
  },
  navSection: {
    gap: Spacing.two,
  },
  navCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  navSub: {
    fontSize: 12.5,
    color: "#9AA0A8",
    marginTop: 1,
  },
  owedSection: { gap: Spacing.two },
  owedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  owedTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  owedCard: { padding: 0, gap: 0, overflow: "hidden" },
  owedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
  },
  owedRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#EDEDED",
  },
  owedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PRIMARY_GREEN + "14",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  owedAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  owedName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#23262B",
  },
  owedAmount: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 1,
  },
  settleBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
