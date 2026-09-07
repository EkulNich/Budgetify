import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { Spacing } from "@/constants/theme";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { formatCurrency } from "@/lib/format";

const PRIMARY_GREEN = "#2D612A";

type StatCardProps = {
  label: string;
  value: number;
  currency: string;
  valueColor?: string;
};

export function StatCard({ label, value, currency, valueColor }: StatCardProps) {
  const animatedValue = useAnimatedNumber(value);

  return (
    <Card style={styles.card}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText
        style={[styles.value, valueColor ? { color: valueColor } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {formatCurrency(animatedValue, currency)}
      </ThemedText>
    </Card>
  );
}

type StatCardRowProps = {
  children: React.ReactNode;
};

export function StatCardRow({ children }: StatCardRowProps) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  card: {
    flex: 1,
    gap: Spacing.half,
    padding: Spacing.two,
    alignItems: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: PRIMARY_GREEN,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: "#23262B",
  },
});
