import { supabase } from "@/lib/supabase";

import * as Device from "expo-device";
import { Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BudgetBar } from "@/components/budget-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { TouchableOpacity } from "react-native";

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

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalSpent: 0,
    remaining: 0,
    percentSpent: 0,
    budget: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState<
    {
      id: string;
      amount: number;
      category: string | null;
      description: string | null;
      created_at: string;
    }[]
  >([]);

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setTimeout(() => {
            router.replace("/login");
          }, 100);
        }
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
      getRecentExpenses();
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

  const getRecentExpenses = async () => {
    // fetch the 10 last expenses for the user
    const { data, error } = await supabase
      .from("expenses")
      .select("id,amount,category,description,created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      console.error("Failure to fetch recent expenses:", error);
      return;
    }
    // visual note inside metro
    console.log("Fetched", data?.length, "expenses");
    if (data) setRecentExpenses(data);
  };

  useEffect(() => {
    const checkSupabase = async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) {
        console.error("Supabase error:", JSON.stringify(error, null, 2));
      } else {
        console.log("Data:", data);
      }
    };

    checkSupabase();
  }, []);
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.topBar}>
          <TouchableOpacity
            style={styles.profileCircle}
            onPress={() => router.push("/login")}
          >
            <ThemedText style={{ color: "white" }}>LC</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/*<ThemedView style={styles.heroSection}>
          <Image
            source={require("@/assets/images/budgetify_name.png")}
            style={{ width: 450, height: 150, borderRadius: 0 }}
          />
        </ThemedView>*/}

        <BudgetBar spendingLimit={stats.budget} outflow={stats.totalSpent} />

        <ThemedText type="subtitle">Recent Expenses</ThemedText>
        {recentExpenses.length === 0 ? (
          <ThemedText type="small">No expenses yet</ThemedText>
        ) : (
          recentExpenses.map((expense) => (
            <ThemedView key={expense.id} style={styles.expenseRow}>
              <ThemedView style={{ flex: 1 }}>
                <ThemedText themeColor="backgroundSelected">
                  {expense.category ?? "Uncategorized"}
                </ThemedText>
                {expense.description && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {expense.description}
                  </ThemedText>
                )}
              </ThemedView>
              <ThemedText style={{ color: "#C0392B" }}>
                -${Number(expense.amount).toFixed(2)}
              </ThemedText>
            </ThemedView>
          ))
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: "center",
  },
  code: {
    textTransform: "uppercase",
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: "stretch",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },

  topBar: {
    alignSelf: "stretch",
    alignItems: "flex-end",
  },

  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2D612A",
    alignItems: "center",
    justifyContent: "center",
  },

  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: Spacing.three,
  },
});
