import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconBadge } from "@/components/ui/icon-badge";
import { SelectModal } from "@/components/ui/select-modal";
import { CURRENCIES } from "@/constants/currencies";
import { Spacing } from "@/constants/theme";
import { DEFAULT_BIO } from "@/constants/profile";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useProfile } from "@/hooks/data/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { formatCurrency } from "@/lib/format";

const PRIMARY_GREEN = "#2D612A";
const TEXT_DARK = "#23262B";

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} — ${c.name}`,
}));

type EditingField = "budget" | "salary" | "hours" | null;

export default function ProfileScreen() {
  const { user } = useCurrentUser();
  const { profile, updateProfile, refetch: refetchProfile } = useProfile(user?.id);
  const colors = useTheme();
  const currency = profile?.currency ?? "SGD";
  const avatarUrl = user?.user_metadata?.avatar_url ?? null;
  const displayName =
    user?.user_metadata?.full_name ?? profile?.username ?? "You";

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editingValue, setEditingValue] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const accessoryInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const openEditor = (field: EditingField, currentRaw: number | null) => {
    setEditingField(field);
    setEditingValue(currentRaw != null ? String(currentRaw) : "");
    requestAnimationFrame(() => accessoryInputRef.current?.focus());
  };

  const cancelEditing = () => {
    setEditingField(null);
    Keyboard.dismiss();
  };

  const handleSaveEditing = async () => {
    if (!editingField || !editingValue.trim()) {
      cancelEditing();
      return;
    }
    const amount = parseFloat(editingValue);
    try {
      if (editingField === "budget") await updateProfile({ monthly_budget: amount });
      if (editingField === "salary") await updateProfile({ monthly_salary: amount });
      if (editingField === "hours") await updateProfile({ hours_per_week: amount });
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      cancelEditing();
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
          <TouchableOpacity style={styles.headerCard} onPress={() => router.push("/edit-profile")}>
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
              <ThemedText style={styles.headerTagline} numberOfLines={2}>
                {profile?.bio || DEFAULT_BIO}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={PRIMARY_GREEN} />
          </TouchableOpacity>

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

            <TouchableOpacity
              style={styles.valueBox}
              onPress={() => openEditor("budget", profile?.monthly_budget ?? null)}
            >
              <ThemedText
                style={[
                  styles.valueBoxText,
                  !profile?.monthly_budget && styles.valueBoxPlaceholder,
                ]}
              >
                {profile?.monthly_budget != null
                  ? formatCurrency(profile.monthly_budget, currency)
                  : "Set a monthly budget"}
              </ThemedText>
              <Ionicons name="chevron-forward" size={15} color={PRIMARY_GREEN} />
            </TouchableOpacity>
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

            <TouchableOpacity
              style={styles.valueBox}
              onPress={() => openEditor("salary", profile?.monthly_salary ?? null)}
            >
              <ThemedText style={styles.valueBoxLabel}>Monthly Salary</ThemedText>
              <View style={styles.valueBoxRight}>
                <ThemedText
                  style={[
                    styles.valueBoxText,
                    !profile?.monthly_salary && styles.valueBoxPlaceholder,
                  ]}
                >
                  {profile?.monthly_salary != null
                    ? formatCurrency(profile.monthly_salary, currency)
                    : "Not set"}
                </ThemedText>
                <Ionicons name="chevron-forward" size={15} color={PRIMARY_GREEN} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.valueBox}
              onPress={() => openEditor("hours", profile?.hours_per_week ?? null)}
            >
              <ThemedText style={styles.valueBoxLabel}>Working Hours</ThemedText>
              <View style={styles.valueBoxRight}>
                <ThemedText
                  style={[
                    styles.valueBoxText,
                    !profile?.hours_per_week && styles.valueBoxPlaceholder,
                  ]}
                >
                  {profile?.hours_per_week != null ? `${profile.hours_per_week}h/week` : "Not set"}
                </ThemedText>
                <Ionicons name="chevron-forward" size={15} color={PRIMARY_GREEN} />
              </View>
            </TouchableOpacity>
          </View>
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
        sortSelectedFirst
        useNativeModal
      />

      {editingField && (
        <>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={cancelEditing} />
          <View style={[styles.accessoryBar, { bottom: keyboardHeight }]}>
            <ThemedText style={styles.accessoryLabel}>
              {editingField === "budget" && "Monthly budget"}
              {editingField === "salary" && "Monthly salary"}
              {editingField === "hours" && "Hours per week"}
            </ThemedText>
            <View style={styles.accessoryInputRow}>
              {editingField !== "hours" && (
                <ThemedText style={styles.accessoryAffix}>{currency}</ThemedText>
              )}
              <TextInput
                ref={accessoryInputRef}
                style={styles.accessoryInput}
                keyboardType="numeric"
                value={editingValue}
                onChangeText={setEditingValue}
                onSubmitEditing={handleSaveEditing}
                returnKeyType="done"
                placeholder="0.00"
                placeholderTextColor="#B0B4BA"
              />
              {editingField === "hours" && (
                <ThemedText style={styles.accessoryAffix}>h/week</ThemedText>
              )}
              <TouchableOpacity style={styles.accessoryDoneBtn} onPress={handleSaveEditing}>
                <ThemedText style={styles.accessoryDoneText}>Done</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
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
  headerCard: {
    backgroundColor: PRIMARY_GREEN + "14",
    borderRadius: 20,
    padding: Spacing.four,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarFallback: {
    backgroundColor: PRIMARY_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
  },
  headerName: {
    fontSize: 21,
    fontWeight: "800",
    color: PRIMARY_GREEN,
  },
  headerTagline: {
    fontSize: 14.5,
    color: "#7A7F87",
    marginTop: 3,
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
  valueBoxText: {
    fontSize: 15,
    fontWeight: "800",
    color: PRIMARY_GREEN,
  },
  valueBoxPlaceholder: {
    fontWeight: "500",
    color: "#B0B4BA",
  },
  accessoryBar: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
    padding: Spacing.three,
    gap: Spacing.one,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 6,
  },
  accessoryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9AA0A8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  accessoryInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  accessoryAffix: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  accessoryInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY_GREEN,
    padding: 0,
  },
  accessoryDoneBtn: {
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  accessoryDoneText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
