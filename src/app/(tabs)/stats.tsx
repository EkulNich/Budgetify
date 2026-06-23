import { supabase } from "@/lib/supabase";
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

export default function StatsScreen() {
  const [salary, setSalary] = useState("");
  const [hours, setHours] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedSalary, setSavedSalary] = useState<number | null>(null);
  const [savedHours, setSavedHours] = useState<number | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState<number | null>(null);

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
        .select("monthly_salary, hours_per_week")
        .eq("id", user.id)
        .single();

      if (data) {
        setSavedSalary(data.monthly_salary);
        setSavedHours(data.hours_per_week);
      }
    };

    fetchProfile();
  }, []);

  const handleAdd = async () => {
    if (!salary || !hours) return;

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Error", "Not logged in");
      setLoading(false);
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
      Alert.alert("Saved!", "Monthly salary saved.");
      setSavedSalary(parseFloat(salary));
      setSavedHours(parseFloat(hours));
      setSalary("");
      setHours("");
    }

    setLoading(false);
  };

  const handleCalculate = () => {
    const amount = parseFloat(expenseAmount);

    if (!savedSalary || !savedHours) {
      Alert.alert("Error", "Please save your salary and hours first.");
      return;
    }
    if (!amount || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    const monthlyHours = (savedHours * 52) / 12;
    const hourlyRate = savedSalary / monthlyHours;
    setHoursNeeded(amount / hourlyRate);
  };

  const getBreakdown = (h: number) => {
    const totalMinutes = Math.round(h * 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hoursPerDay = savedHours ? savedHours / 5 : 8;
    const days = Math.floor(totalHours / hoursPerDay);
    const remainingHours = totalHours % hoursPerDay;

    return { minutes, hours: remainingHours, days };
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
            Stats
          </ThemedText>

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
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={loading}
          >
            <ThemedText style={{ color: "white" }}>
              {loading ? "Saving..." : "Set Monthly Salary"}
            </ThemedText>
          </TouchableOpacity>

          <ThemedView style={styles.divider} />

          <ThemedText style={styles.sectionLabel}>
            How long do I need to work for...
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor="#B0B4BA"
            keyboardType="numeric"
            value={expenseAmount}
            onChangeText={(v) => {
              setExpenseAmount(v);
              setHoursNeeded(null);
            }}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.button} onPress={handleCalculate}>
            <ThemedText style={{ color: "white" }}>Calculate</ThemedText>
          </TouchableOpacity>

          {hoursNeeded !== null &&
            (() => {
              const { minutes, hours: hrs, days } = getBreakdown(hoursNeeded);
              return (
                <ThemedView style={styles.resultCard}>
                  <ThemedText style={styles.resultLabel}>
                    You need to work
                  </ThemedText>
                  <ThemedView style={styles.resultRow}>
                    {days > 0 && (
                      <ThemedView style={styles.resultUnit}>
                        <ThemedText style={styles.resultValue}>
                          {days}
                        </ThemedText>
                        <ThemedText style={styles.resultUnitLabel}>
                          {days === 1 ? "day" : "days"}
                        </ThemedText>
                      </ThemedView>
                    )}
                    {hrs > 0 && (
                      <ThemedView style={styles.resultUnit}>
                        <ThemedText style={styles.resultValue}>
                          {hrs}
                        </ThemedText>
                        <ThemedText style={styles.resultUnitLabel}>
                          {hrs === 1 ? "hour" : "hours"}
                        </ThemedText>
                      </ThemedView>
                    )}
                    {minutes > 0 && (
                      <ThemedView style={styles.resultUnit}>
                        <ThemedText style={styles.resultValue}>
                          {minutes}
                        </ThemedText>
                        <ThemedText style={styles.resultUnitLabel}>
                          {minutes === 1 ? "min" : "mins"}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                </ThemedView>
              );
            })()}
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
  resultCard: {
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  resultLabel: {
    fontSize: 16,
    color: "#888",
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.four,
  },
  resultUnit: {
    alignItems: "center",
    gap: 4,
  },
  resultValue: {
    fontSize: 52,
    fontWeight: "700",
    color: "#2D612A",
    lineHeight: 64,
  },
  resultUnitLabel: {
    fontSize: 14,
    color: "#888",
  },
});
