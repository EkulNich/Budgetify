import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PrimaryButton } from "@/components/ui/primary-button";
import { IconBadge } from "@/components/ui/icon-badge";
import { SelectModal } from "@/components/ui/select-modal";
import { CURRENCIES } from "@/constants/currencies";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useProfile } from "@/hooks/data/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/lib/supabase";

const PRIMARY_GREEN = "#2D612A";
const TEXT_DARK = "#23262B";

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} — ${c.name}`,
}));

export default function ProfileScreen() {
  const { user } = useCurrentUser();
  const { profile, updateProfile } = useProfile(user?.id);
  const colors = useTheme();
  const currency = profile?.currency ?? "SGD";
  const avatarUrl = user?.user_metadata?.avatar_url ?? null;
  const displayName =
    user?.user_metadata?.full_name ?? profile?.username ?? "You";

  const [salaryInput, setSalaryInput] = useState("");
  const [hoursInput, setHoursInput] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetFocused, setBudgetFocused] = useState(false);
  const [salaryFocused, setSalaryFocused] = useState(false);
  const [hoursFocused, setHoursFocused] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);

  // Keep the editable fields in sync with whatever's actually saved.
  useEffect(() => {
    setBudgetInput(profile?.monthly_budget != null ? String(profile.monthly_budget) : "");
  }, [profile?.monthly_budget]);
  useEffect(() => {
    setSalaryInput(profile?.monthly_salary != null ? String(profile.monthly_salary) : "");
  }, [profile?.monthly_salary]);
  useEffect(() => {
    setHoursInput(profile?.hours_per_week != null ? String(profile.hours_per_week) : "");
  }, [profile?.hours_per_week]);

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

  const handleSaveBudget = async () => {
    if (!budgetInput.trim()) return;
    try {
      await updateProfile({ monthly_budget: parseFloat(budgetInput) });
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleSaveSalary = async () => {
    if (!salaryInput.trim()) return;
    try {
      await updateProfile({ monthly_salary: parseFloat(salaryInput) });
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleSaveHours = async () => {
    if (!hoursInput.trim()) return;
    try {
      await updateProfile({ hours_per_week: parseFloat(hoursInput) });
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
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
          <View>
            <ThemedText type="title" style={{ color: colors.backgroundElement }}>
              Profile
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Manage your financial settings and make progress toward your goals.
            </ThemedText>
          </View>

          <View style={styles.headerCard}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <ThemedText style={styles.avatarFallbackText}>
                  {displayName.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.headerName}>{displayName}</ThemedText>
              <ThemedText style={styles.headerTagline}>
                Small steps. Bigger goals. 🌱
              </ThemedText>
            </View>
          </View>

          {/* Currency */}
          <TouchableOpacity
            style={[styles.settingCard, styles.settingCardHeader]}
            onPress={() => setCurrencyPickerVisible(true)}
            disabled={savingCurrency}
          >
            <IconBadge color={PRIMARY_GREEN}>
              <Ionicons name="globe-outline" size={20} color={PRIMARY_GREEN} />
            </IconBadge>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.settingTitle}>Currency</ThemedText>
              <ThemedText style={styles.settingSub}>
                Set your preferred currency for your account.
              </ThemedText>
            </View>
            <View style={styles.settingValueRow}>
              <ThemedText style={styles.settingValue}>{currency}</ThemedText>
              <Ionicons name="chevron-forward" size={15} color={PRIMARY_GREEN} />
            </View>
          </TouchableOpacity>

          {/* Monthly Budget */}
          <View style={styles.settingCard}>
            <View style={styles.settingCardHeader}>
              <IconBadge color={PRIMARY_GREEN}>
                <Ionicons name="wallet-outline" size={20} color={PRIMARY_GREEN} />
              </IconBadge>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.settingTitle}>Monthly Budget</ThemedText>
                <ThemedText style={styles.settingSub}>
                  Set a monthly spending limit to stay on track.
                </ThemedText>
              </View>
            </View>

            <View style={styles.valueBox}>
              <TextInput
                style={[styles.valueBoxInput, { textAlign: "left" }]}
                keyboardType="numeric"
                value={
                  budgetFocused
                    ? budgetInput
                    : profile?.monthly_budget != null
                      ? formatCurrency(profile.monthly_budget, currency)
                      : ""
                }
                onFocus={() => setBudgetFocused(true)}
                onBlur={() => setBudgetFocused(false)}
                onChangeText={setBudgetInput}
                onSubmitEditing={handleSaveBudget}
                returnKeyType="done"
                placeholder="Set a monthly budget"
                placeholderTextColor="#B0B4BA"
              />
              <Ionicons name="chevron-forward" size={15} color={PRIMARY_GREEN} />
            </View>
          </View>

          {/* Income & Work */}
          <View style={styles.settingCard}>
            <View style={styles.settingCardHeader}>
              <IconBadge color={PRIMARY_GREEN}>
                <Ionicons name="briefcase-outline" size={20} color={PRIMARY_GREEN} />
              </IconBadge>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.settingTitle}>Income & Work</ThemedText>
                <ThemedText style={styles.settingSub}>
                  Keep your income details up to date.
                </ThemedText>
              </View>
            </View>

            <View style={styles.valueBox}>
              <ThemedText style={styles.valueBoxLabel}>Monthly Salary</ThemedText>
              <View style={styles.valueBoxRight}>
                <TextInput
                  style={[styles.valueBoxInput, styles.valueBoxInputCompact]}
                  keyboardType="numeric"
                  value={
                    salaryFocused
                      ? salaryInput
                      : profile?.monthly_salary != null
                        ? formatCurrency(profile.monthly_salary, currency)
                        : ""
                  }
                  onFocus={() => setSalaryFocused(true)}
                  onBlur={() => setSalaryFocused(false)}
                  onChangeText={setSalaryInput}
                  onSubmitEditing={handleSaveSalary}
                  returnKeyType="done"
                  placeholder="Not set"
                  placeholderTextColor="#B0B4BA"
                />
                <Ionicons name="chevron-forward" size={15} color={PRIMARY_GREEN} />
              </View>
            </View>

            <View style={styles.valueBox}>
              <ThemedText style={styles.valueBoxLabel}>Working Hours</ThemedText>
              <View style={styles.valueBoxRight}>
                <TextInput
                  style={[styles.valueBoxInput, styles.valueBoxInputCompact]}
                  keyboardType="numeric"
                  value={
                    hoursFocused
                      ? hoursInput
                      : profile?.hours_per_week != null
                        ? `${profile.hours_per_week}h/week`
                        : ""
                  }
                  onFocus={() => setHoursFocused(true)}
                  onBlur={() => setHoursFocused(false)}
                  onChangeText={setHoursInput}
                  onSubmitEditing={handleSaveHours}
                  returnKeyType="done"
                  placeholder="Not set"
                  placeholderTextColor="#B0B4BA"
                />
                <Ionicons name="chevron-forward" size={15} color={PRIMARY_GREEN} />
              </View>
            </View>
          </View>

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
  subtitle: {
    fontSize: 14,
    color: "#7A7F87",
    marginTop: 2,
  },
  headerCard: {
    backgroundColor: PRIMARY_GREEN + "14",
    borderRadius: 18,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    backgroundColor: PRIMARY_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  headerName: {
    fontSize: 18,
    fontWeight: "800",
    color: PRIMARY_GREEN,
  },
  headerTagline: {
    fontSize: 13,
    color: "#7A7F87",
    marginTop: 1,
  },
  settingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  settingSub: {
    fontSize: 12.5,
    color: "#9AA0A8",
    marginTop: 1,
  },
  settingValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: "800",
    color: PRIMARY_GREEN,
  },
  valueBox: {
    backgroundColor: "#F4F6F2",
    borderRadius: 12,
    padding: Spacing.three,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  valueBoxLabel: {
    fontSize: 14.5,
    color: TEXT_DARK,
  },
  valueBoxRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  valueBoxInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: PRIMARY_GREEN,
    padding: 0,
    textAlign: "right",
  },
  valueBoxInputCompact: {
    flex: 0,
    minWidth: 110,
  },
});
