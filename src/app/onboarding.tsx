import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { markOnboardingSeen } from "@/lib/onboarding";

const PRIMARY_GREEN = "#2D612A";

const SLIDES = [
  {
    icon: require("@/assets/images/tabIcons/home.png"),
    label: "Home",
    text: "See your monthly budget progress, AI-powered insights, and recent expenses at a glance.",
  },
  {
    icon: require("@/assets/images/tabIcons/stats.png"),
    label: "Stats",
    text: "Break down your spending by category and track trends from month to month.",
  },
  {
    icon: require("@/assets/images/tabIcons/add.png"),
    label: "Add",
    text: "Log a personal expense, scan a receipt, or add a group expense in seconds.",
  },
  {
    icon: require("@/assets/images/tabIcons/social.png"),
    label: "Social",
    text: "Split bills with Pools, see who owes who, settle up, and nudge friends to pay you back.",
  },
  {
    icon: require("@/assets/images/tabIcons/profile.png"),
    label: "Profile",
    text: "Set your budget, salary, and currency, and control what friends can see.",
  },
] as const;

export default function OnboardingScreen() {
  const { user } = useCurrentUser();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const finish = async () => {
    if (user?.id) {
      await markOnboardingSeen(user.id);
    }
    router.replace("/(tabs)/home");
  };

  const handleNext = () => {
    if (isLast) {
      finish();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          {!isLast && (
            <TouchableOpacity onPress={finish}>
              <ThemedText style={styles.skipText}>Skip</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.iconBadge}>
            <Image source={slide.icon} style={styles.icon} />
          </View>
          <ThemedText style={styles.label}>{slide.label}</ThemedText>
          <ThemedText style={styles.text}>{slide.text}</ThemedText>
        </View>

        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => (
            <TouchableOpacity key={s.label} onPress={() => setIndex(i)}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton label={isLast ? "Get Started" : "Next"} onPress={handleNext} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    minHeight: 24,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9AA0A8",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  iconBadge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: PRIMARY_GREEN + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 48,
    height: 48,
    tintColor: PRIMARY_GREEN,
  },
  label: {
    fontSize: 22,
    fontWeight: "800",
    color: PRIMARY_GREEN,
  },
  text: {
    fontSize: 15,
    color: "#9AA0A8",
    textAlign: "center",
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: Spacing.four,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_GREEN + "33",
  },
  dotActive: {
    backgroundColor: PRIMARY_GREEN,
    width: 20,
  },
});
