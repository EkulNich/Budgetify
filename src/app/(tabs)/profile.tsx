import { useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionLabel } from "@/components/ui/section-label";
import { SelectModal } from "@/components/ui/select-modal";
import { TextField } from "@/components/ui/text-field";
import { CURRENCIES } from "@/constants/currencies";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useProfile } from "@/hooks/data/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/lib/supabase";

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} — ${c.name}`,
}));

export default function ProfileScreen() {
  const { user } = useCurrentUser();
  const { profile, updateProfile } = useProfile(user?.id);
  const colors = useTheme();
  const currency = profile?.currency ?? "SGD";

  const [salary, setSalary] = useState("");
  const [hours, setHours] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);

  const hoursRef = useRef<TextInput>(null);

  const handleChangeCurrency = async (newCurrency: string) => {
    setSavingCurrency(true);
    try {
      await updateProfile({ currency: newCurrency });
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleSaveSalary = async () => {
    if (!salary || !hours) return;

    setLoadingSalary(true);
    try {
      await updateProfile({
        monthly_salary: parseFloat(salary),
        hours_per_week: parseFloat(hours),
      });
      Alert.alert("Saved!", "Monthly salary updated.");
      setSalary("");
      setHours("");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setLoadingSalary(false);
    }
  };

  const handleSaveBudget = async () => {
    if (!monthlyBudget) return;

    setLoadingBudget(true);
    try {
      await updateProfile({ monthly_budget: parseFloat(monthlyBudget) });
      Alert.alert("Saved!", "Monthly budget updated.");
      setMonthlyBudget("");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setLoadingBudget(false);
    }
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

          <SectionLabel>Currency</SectionLabel>
          <TouchableOpacity
            style={[styles.dropdown, { borderColor: colors.backgroundElement }]}
            onPress={() => setCurrencyPickerVisible(true)}
            disabled={savingCurrency}
          >
            <ThemedText style={{ color: colors.backgroundElement }}>
              {currency}
            </ThemedText>
            <ThemedText style={{ color: colors.backgroundElement }}>▾</ThemedText>
          </TouchableOpacity>

          <ThemedView style={styles.divider} />

          <SectionLabel>Monthly Budget</SectionLabel>
          <TextField
            placeholder={
              profile?.monthly_budget
                ? `Current: ${formatCurrency(profile.monthly_budget, currency)}`
                : "Monthly budget"
            }
            keyboardType="numeric"
            value={monthlyBudget}
            onChangeText={setMonthlyBudget}
            returnKeyType="done"
          />
          <PrimaryButton
            label={loadingBudget ? "Saving..." : "Set Monthly Budget"}
            loading={loadingBudget}
            onPress={handleSaveBudget}
          />

          <ThemedView style={styles.divider} />

          <SectionLabel>Monthly Salary</SectionLabel>
          <TextField
            placeholder={
              profile?.monthly_salary
                ? `Current: ${formatCurrency(profile.monthly_salary, currency)}`
                : "Monthly salary"
            }
            keyboardType="numeric"
            value={salary}
            onChangeText={setSalary}
            returnKeyType="next"
            onSubmitEditing={() => hoursRef.current?.focus()}
          />
          <TextField
            ref={hoursRef}
            placeholder={
              profile?.hours_per_week
                ? `Current: ${profile.hours_per_week}h/week`
                : "Hours per week"
            }
            keyboardType="numeric"
            value={hours}
            onChangeText={setHours}
            returnKeyType="done"
          />
          <PrimaryButton
            label={loadingSalary ? "Saving..." : "Set Monthly Salary"}
            loading={loadingSalary}
            onPress={handleSaveSalary}
          />
          <ThemedView style={styles.divider} />

          <PrimaryButton
            label="Sign Out"
            variant="danger"
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
          />
        </ScrollView>
      </SafeAreaView>

      <SelectModal
        visible={currencyPickerVisible}
        title="Currency"
        options={CURRENCY_OPTIONS}
        selectedValue={currency}
        colors={colors}
        onSelect={handleChangeCurrency}
        onClose={() => setCurrencyPickerVisible(false)}
      />
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
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: Spacing.one,
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
  },
});
