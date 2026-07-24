import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SocialScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText
          type="title"
          style={{
            color: colors.backgroundElement,
            marginBottom: Spacing.four,
          }}
        >
          Social
        </ThemedText>

        <TouchableOpacity
          style={[styles.banner, { backgroundColor: colors.backgroundElement }]}
          onPress={() => router.push("/social/friends")}
        >
          <ThemedText style={styles.bannerTitle}>👥 Friends</ThemedText>
          <ThemedText style={styles.bannerSub}>
            View friends, streaks & requests
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.banner, { backgroundColor: colors.backgroundElement }]}
          onPress={() => router.push("/social/pools")}
        >
          <ThemedText style={styles.bannerTitle}>💰 Group Pools</ThemedText>
          <ThemedText style={styles.bannerSub}>
            Shared budgets with your friends
          </ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  banner: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  bannerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  bannerSub: { fontSize: 14, color: "#ffffff99" },
});
