import { getRecommendations } from "@/lib/recommendations";
import { supabase } from "@/lib/supabase";

import * as Device from "expo-device";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BudgetBar } from "@/components/budget-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

function getDevMenuHint() {
  if (Platform.OS === "web") {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === "android" ? "cmd+m (or ctrl+m)" : "cmd+d";
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

type Expense = {
  id: string;
  amount: number;
  category: string | null;
  description: string | null;
  created_at: string;
};

function SwipeableExpenseRow({
  expense,
  onDelete,
}: {
  expense: Expense;
  onDelete: (id: string) => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const isGroupExpense =
    expense.category !== null &&
    !["food", "transport", "entertainment", "loans", "others"].includes(
      expense.category.toLowerCase(),
    );

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    if (isGroupExpense) return null;
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    return (
      <Animated.View
        style={[styles.deleteAction, { transform: [{ translateX: trans }] }]}
      >
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            swipeableRef.current?.close();
            Alert.alert(
              "Delete Expense",
              "Are you sure you want to delete this expense?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => onDelete(expense.id),
                },
              ],
            );
          }}
        >
          <ThemedText
            style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}
          >
            Delete
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={isGroupExpense ? undefined : renderRightActions}
      rightThreshold={40}
      enabled={!isGroupExpense}
    >
      <ThemedView style={styles.expenseRow}>
        <View style={{ flex: 1 }}>
          <ThemedText themeColor="backgroundSelected">
            {expense.category ?? "Uncategorized"}
          </ThemedText>
          {expense.description && (
            <ThemedText type="small" themeColor="textSecondary">
              {expense.description}
            </ThemedText>
          )}
        </View>
        <ThemedText style={{ color: "#C0392B" }}>
          -${Number(expense.amount).toFixed(2)}
        </ThemedText>
      </ThemedView>
    </Swipeable>
  );
}

export default function HomeScreen() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setAvatarUrl(user.user_metadata?.avatar_url ?? null);
    };
    fetchUser();
  }, []);

  const router = useRouter();
  const [stats, setStats] = useState({
    totalSpent: 0,
    remaining: 0,
    percentSpent: 0,
    budget: 0,
  });
  const [recentExpenses, setExpenses] = useState<Expense[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [streak, setStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) setTimeout(() => router.replace("/login"), 100);
      });
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      getMonthlyStats();
    }, []),
  );
  useFocusEffect(
    useCallback(() => {
      getExpenses();
    }, []),
  );
  useFocusEffect(
    useCallback(() => {
      fetchTips();
    }, []),
  );
  useFocusEffect(
    useCallback(() => {
      fetchStreak();
    }, []),
  );

  const getMonthlyStats = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (!profile) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount")
      .gte("created_at", startOfMonth.toISOString());
    const totalSpent =
      expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
    const remaining = Number(profile.monthly_budget) - totalSpent;
    const percentSpent = (totalSpent / Number(profile.monthly_budget)) * 100;
    setStats({
      totalSpent,
      remaining,
      percentSpent,
      budget: profile.monthly_budget,
    });
  };

  const fetchStreak = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("streak_count, last_expense_date")
      .eq("id", user.id)
      .single();
    if (!profile) return;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    if (
      profile.last_expense_date === today ||
      profile.last_expense_date === yesterday
    ) {
      setStreak(profile.streak_count ?? 0);
    } else {
      setStreak(0);
    }
  };

  const getExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("id,amount,category,description,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failure to fetch recent expenses:", error);
      return;
    }
    if (data) setExpenses(data);
  };

  const deleteExpense = async (expenseId: string) => {
    await supabase.from("expenses").delete().eq("id", expenseId);
    getExpenses();
    getMonthlyStats();
  };

  const fetchTips = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: cached } = await supabase
      .from("ai_tips")
      .select("tips, generated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (cached) {
      const ageMs = Date.now() - new Date(cached.generated_at).getTime();
      if (ageMs < 24 * 60 * 60 * 1000) {
        setRecommendations(cached.tips);
        return;
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("monthly_salary, monthly_budget")
      .eq("id", user.id)
      .single();
    if (!profile) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("amount,category")
      .gte("created_at", startOfMonth.toISOString());
    if (!expensesData) return;

    setTipsLoading(true);
    try {
      const tips = await getRecommendations(
        Number(profile.monthly_salary),
        Number(profile.monthly_budget),
        expensesData.map((e) => ({ amount: e.amount, category: e.category })),
      );
      setRecommendations(tips);
      await supabase
        .from("ai_tips")
        .upsert(
          { user_id: user.id, tips, generated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    } catch (e) {
      console.error("Failed to fetch recommendations:", e);
      setRecommendations([]);
    } finally {
      setTipsLoading(false);
    }
  };

  useEffect(() => {
    const checkSupabase = async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error)
        console.error("Supabase error:", JSON.stringify(error, null, 2));
      else console.log("Data:", data);
    };
    checkSupabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={{ alignSelf: "stretch" }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <Image
                source={require("@/assets/images/budgetify_name.png")}
                style={styles.logo}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.profileCircle}
                onPress={() => router.push("/(tabs)/profile")}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <ThemedText style={{ color: "white" }}>?</ThemedText>
                )}
              </TouchableOpacity>
            </View>

            <BudgetBar
              spendingLimit={stats.budget}
              outflow={stats.totalSpent}
            />

            <View style={styles.streakCard}>
              <ThemedText type="smallBold" themeColor="backgroundSelected">
                🔥 Daily Streak
              </ThemedText>
              <Text
                style={{
                  fontSize: 48,
                  fontWeight: "bold",
                  color: "#2D612A",
                  lineHeight: 40,
                  paddingTop: 8,
                }}
              >
                {streak}
              </Text>
              <ThemedText type="small" themeColor="textSecondary">
                {streak === 0
                  ? "Log an expense to start your streak!"
                  : streak === 1
                    ? "1 day — keep it going!"
                    : `${streak} days in a row!`}
              </ThemedText>
            </View>

            <View style={styles.tipCard}>
              <ThemedText type="smallBold" themeColor="backgroundSelected">
                AI Smart Recommendations
              </ThemedText>
              {tipsLoading ? (
                <ActivityIndicator color="#2D612A" />
              ) : recommendations.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No recommendations available
                </ThemedText>
              ) : (
                recommendations.map((tip, index) => (
                  <ThemedText
                    key={index}
                    type="small"
                    themeColor="backgroundSelected"
                    style={{ marginTop: index === 0 ? 4 : 8 }}
                  >
                    {tip}
                  </ThemedText>
                ))
              )}
            </View>

            <ThemedView style={styles.expensesCard}>
              <ThemedText type="subtitle" themeColor="backgroundSelected">
                Expenses
              </ThemedText>
              {recentExpenses.length === 0 ? (
                <ThemedText type="small">No expenses yet</ThemedText>
              ) : (
                recentExpenses.map((expense) => (
                  <SwipeableExpenseRow
                    key={expense.id}
                    expense={expense}
                    onDelete={deleteExpense}
                  />
                ))
              )}
            </ThemedView>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", flexDirection: "row" },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  topBar: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  logo: { width: 200, height: 80, marginLeft: -10 },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2D612A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: "#E8F0E5",
    borderRadius: 12,
    gap: Spacing.three,
  },
  scrollContent: {
    alignSelf: "stretch",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  expensesCard: {
    alignSelf: "stretch",
    backgroundColor: "white",
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tipCard: {
    alignSelf: "stretch",
    backgroundColor: "white",
    borderRadius: 16,
    padding: Spacing.three,
    shadowColor: "#000",
    gap: Spacing.one,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  streakCard: {
    alignSelf: "stretch",
    backgroundColor: "white",
    alignItems: "center",
    borderRadius: 16,
    padding: Spacing.three,
    shadowColor: "#000",
    gap: Spacing.one,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteAction: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginVertical: 0,
  },
  deleteBtn: {
    backgroundColor: "#e55",
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    borderRadius: 12,
    alignSelf: "stretch",
    height: "100%",
  },
});
