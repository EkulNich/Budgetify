import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconBadge } from "@/components/ui/icon-badge";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { useBalancesSummary } from "@/hooks/data/use-balances-summary";
import { useProfile } from "@/hooks/data/use-profile";
import { formatCurrency } from "@/lib/format";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY_GREEN = "#2D612A";
const NEGATIVE_RED = "#C0392B";
const TEXT_DARK = "#23262B";

function BalanceHeroCard({
  backgroundColor,
  accentColor,
  label,
  amount,
  currency,
  count,
  onPress,
}: {
  backgroundColor: string;
  accentColor: string;
  label: string;
  amount: number;
  currency: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.heroCard, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <IconBadge color="#FFFFFF" size={52}>
        <Ionicons name="people-outline" size={26} color="#fff" />
      </IconBadge>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.heroLabel, { color: accentColor }]}>{label}</ThemedText>
        <ThemedText style={styles.heroValue}>{formatCurrency(amount, currency)}</ThemedText>
        <ThemedText style={[styles.heroSubtext, { color: accentColor }]}>
          Across {count} {count === 1 ? "person" : "people"}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={accentColor} />
    </TouchableOpacity>
  );
}

export default function SocialScreen() {
  const { user } = useCurrentUser();
  const { profile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const currency = profile?.currency ?? "SGD";
  const { owedToYou, owedByYou, refetch: refetchBalances } = useBalancesSummary(
    user?.id,
    currency,
    convert,
  );

  useFocusEffect(
    useCallback(() => {
      refetchBalances();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, currency]),
  );

  const totalOwedToYou = owedToYou.reduce((sum, b) => sum + b.amount, 0);
  const totalOwedByYou = owedByYou.reduce((sum, b) => sum + b.amount, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {owedToYou.length > 0 && (
            <BalanceHeroCard
              backgroundColor={PRIMARY_GREEN}
              accentColor="#cfe6c9"
              label="You're Owed"
              amount={totalOwedToYou}
              currency={currency}
              count={owedToYou.length}
              onPress={() => router.push("/social/owed-to-you")}
            />
          )}

          {owedByYou.length > 0 && (
            <BalanceHeroCard
              backgroundColor={NEGATIVE_RED}
              accentColor="#f3c9c2"
              label="You Owe"
              amount={totalOwedByYou}
              currency={currency}
              count={owedByYou.length}
              onPress={() => router.push("/social/you-owe")}
            />
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
    textTransform: "uppercase",
  },
  heroValue: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    color: "#fff",
    marginTop: 2,
  },
  heroSubtext: {
    fontSize: 12.5,
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
});
