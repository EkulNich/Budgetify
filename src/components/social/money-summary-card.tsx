import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import { StyleSheet, View } from "react-native";

type MoneySummaryCardProps = {
  label: string;
  amount: number;
  currency: string;
  subtext: string;
  color: string;
  /** "shine" for a positive/received balance, "down" for money owed out. */
  icon?: "shine" | "down";
};

/** A light-tinted hero card showing one money total — reused across balance and history screens. */
export function MoneySummaryCard({
  label,
  amount,
  currency,
  subtext,
  color,
  icon = "shine",
}: MoneySummaryCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: color + "1F" }]}>
      <View style={[styles.circleLg, { backgroundColor: color + "14" }]} />
      <View style={[styles.circleSm, { backgroundColor: color + "12" }]} />
      <View style={styles.row}>
        <View>
          <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
          <ThemedText style={[styles.value, { color }]}>
            {formatCurrency(amount, currency)}
          </ThemedText>
          <ThemedText style={[styles.subtext, { color }]}>{subtext}</ThemedText>
        </View>
        <View style={styles.iconWrap}>
          <FontAwesome5 name="coins" size={38} color={color} />
          <Ionicons
            name={icon === "down" ? "arrow-down-circle" : "sparkles"}
            size={16}
            color={color}
            style={styles.sparkle}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: Spacing.four,
    overflow: "hidden",
  },
  circleLg: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    top: -60,
    right: -40,
  },
  circleSm: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    bottom: -50,
    right: 30,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    opacity: 0.75,
  },
  value: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "800",
    marginTop: 4,
  },
  subtext: {
    fontSize: 14,
    opacity: 0.75,
    marginTop: 2,
  },
  iconWrap: {
    marginTop: 4,
  },
  sparkle: {
    position: "absolute",
    top: -10,
    right: -10,
  },
});
