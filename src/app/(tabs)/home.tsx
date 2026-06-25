import { supabase } from "@/lib/supabase";

import * as Device from "expo-device";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BudgetBar } from "@/components/budget-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { Image } from "expo-image";
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
  const [recentExpenses, setExpenses] = useState<
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
      getExpenses();
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

  const getExpenses = async () => {
    // fetch the 10 last expenses for the user
    const { data, error } = await supabase
      .from("expenses")
      .select("id,amount,category,description,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failure to fetch recent expenses:", error);
      return;
    }
    // visual note inside metro
    console.log("Fetched", data?.length, "expenses");
    if (data) setExpenses(data);
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
        <View style={styles.topBar}>
          <Image
            source={require("@/assets/images/budgetify_name.png")}
            style={styles.logo}
            contentFit="cover"
          />
          <TouchableOpacity
            style={styles.profileCircle}
            onPress={() => router.push("/login")}
          >
            <ThemedText style={{ color: "white" }}>LC</ThemedText>
          </TouchableOpacity>
        </View>

        {/*<ThemedView style={styles.heroSection}>
          <Image
            source={require("@/assets/images/budgetify_name.png")}
            style={{ width: 450, height: 150, borderRadius: 0 }}
          />
        </ThemedView>*/}

        <BudgetBar spendingLimit={stats.budget} outflow={stats.totalSpent} />

        <ThemedView style={styles.expensesCard}>
          <ScrollView
            style={{ alignSelf: "stretch" }}
            contentContainerStyle={{ gap: Spacing.two }}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="subtitle" themeColor="backgroundSelected">
              Expenses
            </ThemedText>
            {recentExpenses.length === 0 ? (
              <ThemedText type="small">No expenses yet</ThemedText>
            ) : (
              recentExpenses.map((expense) => (
                <ThemedView key={expense.id} style={styles.expenseRow}>
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
              ))
            )}
          </ScrollView>
        </ThemedView>
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
    gap: Spacing.two,
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
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    //paddingVertical: Spacing.one,
  },

  logo: {
    width: 200,
    height: 80,
    marginLeft: -25,
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
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: "#E8F0E5",
    borderRadius: 12,
    borderBottomColor: "#f3f3f3",
    gap: Spacing.three,
  },

  expensesCard: {
    flex: 1,
    alignSelf: "stretch",
    backgroundColor: "white",
    borderRadius: 16,
    padding: Spacing.three,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
