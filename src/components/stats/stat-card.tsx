import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { Spacing } from "@/constants/theme";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { formatCurrency } from "@/lib/format";

const PRIMARY_GREEN = "#2D612A";
const NEGATIVE_RED = "#C0392B";

export type StatCardIcon = "spending" | "remaining" | "projected";

type StatCardProps = {
  label: string;
  value: number;
  currency: string;
  icon: StatCardIcon;
  valueColor?: string;
  /** Percent change vs. last month, or null when there's nothing to compare against. */
  changePercent: number | null;
  /** Which direction of change counts as good news for this metric. */
  changeGoodDirection: "up" | "down";
};

function StatCardIconGlyph({ icon }: { icon: StatCardIcon }) {
  if (icon === "spending") {
    return <Ionicons name="wallet-outline" size={17} color={PRIMARY_GREEN} />;
  }
  if (icon === "remaining") {
    return <MaterialCommunityIcons name="cash-multiple" size={18} color={PRIMARY_GREEN} />;
  }
  return <Ionicons name="trending-up-outline" size={17} color={PRIMARY_GREEN} />;
}

export function StatCard({
  label,
  value,
  currency,
  icon,
  valueColor,
  changePercent,
  changeGoodDirection,
}: StatCardProps) {
  const animatedValue = useAnimatedNumber(value);

  const isGoodChange =
    changePercent !== null &&
    (changeGoodDirection === "down" ? changePercent < 0 : changePercent > 0);
  const changeColor = isGoodChange ? PRIMARY_GREEN : NEGATIVE_RED;

  return (
    <Card style={styles.card}>
      <IconBadge color={PRIMARY_GREEN} size={34}>
        <StatCardIconGlyph icon={icon} />
      </IconBadge>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText
        style={[styles.value, valueColor ? { color: valueColor } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {formatCurrency(animatedValue, currency)}
      </ThemedText>
      {changePercent !== null && (
        <View style={styles.changeRow}>
          <Ionicons
            name={changePercent > 0 ? "arrow-up" : "arrow-down"}
            size={10}
            color={changeColor}
          />
          <ThemedText style={[styles.changeValue, { color: changeColor }]}>
            {Math.round(Math.abs(changePercent))}%
          </ThemedText>
          <ThemedText style={styles.changeLabel}>vs last month</ThemedText>
        </View>
      )}
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
    fontSize: 10.5,
    fontWeight: "800",
    color: PRIMARY_GREEN,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    lineHeight: 13,
  },
  value: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
    color: "#23262B",
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  changeValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  changeLabel: {
    fontSize: 9.5,
    color: "#9AA0A8",
  },
});
