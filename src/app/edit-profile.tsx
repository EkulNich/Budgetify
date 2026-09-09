import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionLabel } from "@/components/ui/section-label";
import { TextField } from "@/components/ui/text-field";
import { ToggleRow } from "@/components/ui/toggle-row";
import { DEFAULT_BIO } from "@/constants/profile";
import { Spacing } from "@/constants/theme";
import { useBalancesSummary } from "@/hooks/data/use-balances-summary";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { useProfile } from "@/hooks/data/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { deleteAccount } from "@/lib/account";
import { supabase } from "@/lib/supabase";

export default function EditProfileScreen() {
  const { user } = useCurrentUser();
  const { profile, updateProfile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const { owedToYou, owedByYou } = useBalancesSummary(
    user?.id,
    profile?.currency ?? "SGD",
    convert,
  );
  const colors = useTheme();
  const [deleting, setDeleting] = useState(false);

  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Leaving the box blank keeps the current bio — the placeholder already
    // shows what that is, so there's nothing to overwrite it with.
    if (!bio.trim()) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ bio: bio.trim() });
      router.back();
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePrivacy = async (
    field: "hide_budget_from_friends" | "is_private" | "discoverable",
    value: boolean,
  ) => {
    try {
      await updateProfile({ [field]: value });
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleSignOut = () => {
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
  };

  const handleDeleteAccount = () => {
    const parts: string[] = [];
    if (owedToYou.length > 0) {
      parts.push(
        `${owedToYou.length} ${owedToYou.length === 1 ? "person" : "people"} still owe${owedToYou.length === 1 ? "s" : ""} you money`,
      );
    }
    if (owedByYou.length > 0) {
      parts.push(
        `you still owe ${owedByYou.length} ${owedByYou.length === 1 ? "person" : "people"}`,
      );
    }
    const balanceWarning =
      parts.length > 0
        ? `\n\nHeads up: ${parts.join(", and ")}. Deleting your account won't settle this — the other side will be left with a balance against a deleted account.`
        : "";

    Alert.alert(
      "Delete Account",
      `This permanently deletes your account. Your personal expenses, friends, and pool memberships are removed. This cannot be undone.${balanceWarning}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
            } catch (error) {
              Alert.alert("Error", (error as Error).message);
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.backgroundElement} />
            </TouchableOpacity>
            <ThemedText type="title" style={{ color: colors.backgroundElement, fontSize: 20 }}>
              Edit Profile
            </ThemedText>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SectionLabel style={{ color: colors.backgroundElement }}>Bio</SectionLabel>
            <TextField
              value={bio}
              onChangeText={setBio}
              placeholder={profile?.bio || DEFAULT_BIO}
              multiline
              numberOfLines={3}
              maxLength={80}
              style={styles.bioInput}
            />
            <PrimaryButton
              label={saving ? "Saving..." : "Save"}
              loading={saving}
              onPress={handleSave}
            />

            <View style={styles.divider} />

            <SectionLabel style={{ color: colors.backgroundElement }}>Privacy</SectionLabel>
            <ToggleRow
              label="Hide budget from friends"
              description="Friends won't see your budget-used % or progress bar."
              value={profile?.hide_budget_from_friends ?? false}
              onValueChange={(v) => handleTogglePrivacy("hide_budget_from_friends", v)}
              colors={colors}
            />
            <ToggleRow
              label="Private profile"
              description="Hide your streak from anyone who finds you in search but isn't yet a friend."
              value={profile?.is_private ?? false}
              onValueChange={(v) => handleTogglePrivacy("is_private", v)}
              colors={colors}
            />
            <ToggleRow
              label="Appear in search"
              description="Let other users find you by username to send a friend request."
              value={profile?.discoverable ?? true}
              onValueChange={(v) => handleTogglePrivacy("discoverable", v)}
              colors={colors}
            />

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.navRow}
              onPress={() => router.push("/manage-categories")}
            >
              <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
                Manage Categories
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={colors.backgroundElement} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <PrimaryButton label="Sign Out" variant="danger" onPress={handleSignOut} />
            <PrimaryButton
              label={deleting ? "Deleting..." : "Delete Account"}
              variant="danger"
              loading={deleting}
              onPress={handleDeleteAccount}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: "#D7D9DC",
    marginVertical: Spacing.one,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
});
