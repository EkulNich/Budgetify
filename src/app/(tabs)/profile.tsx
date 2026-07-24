import { useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const [salary, setSalary] = useState("");
  const [hours, setHours] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [savedSalary, setSavedSalary] = useState<number | null>(null);
  const [savedHours, setSavedHours] = useState<number | null>(null);
  const [savedBudget, setSavedBudget] = useState<number | null>(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(false);

  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];
  const hoursRef = useRef<TextInput>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("monthly_salary, hours_per_week, monthly_budget")
        .eq("id", user.id)
        .single();

      if (data) {
        setSavedSalary(data.monthly_salary);
        setSavedHours(data.hours_per_week);
        setSavedBudget(data.monthly_budget);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveSalary = async () => {
    if (!salary || !hours) return;

    setLoadingSalary(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Error", "Not logged in");
      setLoadingSalary(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      monthly_salary: parseFloat(salary),
      hours_per_week: parseFloat(hours),
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Saved!", "Monthly salary updated.");
      setSavedSalary(parseFloat(salary));
      setSavedHours(parseFloat(hours));
      setSalary("");
      setHours("");
    }

    setLoadingSalary(false);
  };

  const handleSaveBudget = async () => {
    if (!monthlyBudget) return;

    setLoadingBudget(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Error", "Not logged in");
      setLoadingBudget(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      monthly_budget: parseFloat(monthlyBudget),
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Saved!", "Monthly budget updated.");
      setSavedBudget(parseFloat(monthlyBudget));
      setMonthlyBudget("");
    }

    setLoadingBudget(false);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title" style={{ color: colors.backgroundElement }}>
            Profile
          </ThemedText>

          <ThemedText style={styles.sectionLabel}>Monthly Budget</ThemedText>
          <TextInput
            style={styles.input}
            placeholder={
              savedBudget
                ? `Current: $${savedBudget.toLocaleString()}`
                : "Monthly budget"
            }
            placeholderTextColor="#B0B4BA"
            keyboardType="numeric"
            value={monthlyBudget}
            onChangeText={setMonthlyBudget}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.button, loadingBudget && { opacity: 0.6 }]}
            onPress={handleSaveBudget}
            disabled={loadingBudget}
          >
            <ThemedText style={{ color: "white" }}>
              {loadingBudget ? "Saving..." : "Set Monthly Budget"}
            </ThemedText>
          </TouchableOpacity>

          <ThemedView style={styles.divider} />

          <ThemedText style={styles.sectionLabel}>Monthly Salary</ThemedText>
          <TextInput
            style={styles.input}
            placeholder={
              savedSalary
                ? `Current: $${savedSalary.toLocaleString()}`
                : "Monthly salary"
            }
            placeholderTextColor="#B0B4BA"
            keyboardType="numeric"
            value={salary}
            onChangeText={setSalary}
            returnKeyType="next"
            onSubmitEditing={() => hoursRef.current?.focus()}
          />
          <TextInput
            ref={hoursRef}
            style={styles.input}
            placeholder={
              savedHours ? `Current: ${savedHours}h/week` : "Hours per week"
            }
            placeholderTextColor="#B0B4BA"
            keyboardType="numeric"
            value={hours}
            onChangeText={setHours}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.button, loadingSalary && { opacity: 0.6 }]}
            onPress={handleSaveSalary}
            disabled={loadingSalary}
          >
            <ThemedText style={{ color: "white" }}>
              {loadingSalary ? "Saving..." : "Set Monthly Salary"}
            </ThemedText>
          </TouchableOpacity>
          <ThemedView style={styles.divider} />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#e55" }]}
            onPress={() => {
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign Out",
                  style: "destructive",
                  onPress: async () => {
                    await supabase.auth.signOut();
                  },
                },
              ]);
            }}
          >
            <ThemedText style={{ color: "white" }}>Sign Out</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2D612A",
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: Spacing.one,
  },
});
