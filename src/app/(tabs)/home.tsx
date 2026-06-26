import { getRecommendations } from "@/lib/recommendations";
import { supabase } from "@/lib/supabase";

import * as Device from "expo-device";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BudgetBar } from "@/components/budget-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
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

  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      fetchTips();
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
    // fetch the recent expenses for the user
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

  const fetchTips = async () => {
    // need profile and expensed to call Gemini
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // check cache first
    const { data: cached } = await supabase
      .from("ai_tips")
      .select("tips, generated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (cached) {
      const ageMs = Date.now() - new Date(cached.generated_at).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (ageMs < oneDayMs) {
        // Use cached tips if they are less than a day old. Skip Gemini call.
        console.log(
          "Using cached tips, age:",
          Math.round(ageMs / 1000 / 60 / 60),
          "hours",
        );
        setRecommendations(cached.tips);
        return;
      }
      console.log("Cached tips are too old, fetching new ones.");
    } else {
      console.log("No cached tips found, generating first time.");
    }

    // Gemini call to get recommendations
    const { data: profile } = await supabase
      .from("profiles")
      .select("monthly_salary, monthly_budget")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    //Fetch expenses directly from Supabase.
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
        expensesData.map((e) => ({
          amount: e.amount,
          category: e.category,
        })),
      );
      setRecommendations(tips);

      // Cache the tips in Supabase for future use
      const { error: cacheError } = await supabase.from("ai_tips").upsert(
        {
          user_id: user.id,
          tips,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (cacheError) {
        console.error("Failed to cache AI tips:", cacheError);
      }
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
            {/* <ScrollView
            style={{ alignSelf: "stretch" }}
            contentContainerStyle={{ gap: Spacing.two }}
            showsVerticalScrollIndicator={false}
          > */}
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

            {/*</ScrollView>*/}
          </ThemedView>
        </ScrollView>
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
    marginLeft: -10,
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

  scrollContent: {
    alignSelf: "stretch",
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },

  expensesCard: {
    alignSelf: "stretch",
    backgroundColor: "white",
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
