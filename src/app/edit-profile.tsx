import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { DEFAULT_BIO } from "@/constants/profile";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useProfile } from "@/hooks/data/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";

export default function EditProfileScreen() {
  const { user } = useCurrentUser();
  const { profile, updateProfile } = useProfile(user?.id);
  const colors = useTheme();

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

          <View style={styles.content}>
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

            <PrimaryButton label="Sign Out" variant="danger" onPress={handleSignOut} />
          </View>
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
});
