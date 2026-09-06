import { StyleSheet, View } from "react-native";
import Svg, { Line, Polygon, Polyline } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import type { DailyAmount } from "@/lib/stats";

const TEXT_GREY = "#7A7F87";
const ACTUAL_COLOR = "#2D612A";
const ACTUAL_FILL = "#2D612A22";
const TRAJECTORY_COLOR = "#B0B4BA";

const CHART_HEIGHT = 160;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 20;
const PADDING_X = 4;

type SpendingLineChartProps = {
  actual: DailyAmount[];
  trajectory: DailyAmount[];
  daysInMonth: number;
  width: number;
};

/** Cumulative spending for the month, with the even-budget-pace line overlaid for reference. */
export function SpendingLineChart({
  actual,
  trajectory,
  daysInMonth,
  width,
}: SpendingLineChartProps) {
  if (daysInMonth <= 1 || width <= 0) return null;

  const plotWidth = width - PADDING_X * 2;
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const maxAmount = Math.max(
    1,
    ...actual.map((p) => p.amount),
    ...trajectory.map((p) => p.amount),
  );

  const toX = (day: number) => PADDING_X + ((day - 1) / (daysInMonth - 1)) * plotWidth;
  const toY = (amount: number) =>
    PADDING_TOP + plotHeight - (amount / maxAmount) * plotHeight;

  const actualPoints = actual.map((p) => `${toX(p.day)},${toY(p.amount)}`).join(" ");
  const trajectoryPoints = trajectory
    .map((p) => `${toX(p.day)},${toY(p.amount)}`)
    .join(" ");

  const areaPoints = actual.length
    ? `${toX(actual[0].day)},${toY(0)} ${actualPoints} ${toX(
        actual[actual.length - 1].day,
      )},${toY(0)}`
    : "";

  const baselineY = toY(0);

  return (
    <View>
      <Svg width={width} height={CHART_HEIGHT}>
        <Line
          x1={PADDING_X}
          y1={baselineY}
          x2={width - PADDING_X}
          y2={baselineY}
          stroke="#E5E5E5"
          strokeWidth={1}
        />
        {trajectory.length > 0 && (
          <Polyline
            points={trajectoryPoints}
            fill="none"
            stroke={TRAJECTORY_COLOR}
            strokeWidth={2}
            strokeDasharray="6,5"
          />
        )}
        {areaPoints !== "" && (
          <Polygon points={areaPoints} fill={ACTUAL_FILL} stroke="none" />
        )}
        {actual.length > 0 && (
          <Polyline
            points={actualPoints}
            fill="none"
            stroke={ACTUAL_COLOR}
            strokeWidth={2.5}
          />
        )}
      </Svg>

      <View style={styles.axisRow}>
        <ThemedText style={styles.axisLabel}>Day 1</ThemedText>
        <ThemedText style={styles.axisLabel}>Day {daysInMonth}</ThemedText>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: ACTUAL_COLOR }]} />
          <ThemedText style={styles.legendLabel}>Actual spending</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { backgroundColor: TRAJECTORY_COLOR }]} />
          <ThemedText style={styles.legendLabel}>Even budget pace</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  axisLabel: {
    fontSize: 11,
    color: TEXT_GREY,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDash: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  legendLabel: {
    fontSize: 12,
    color: TEXT_GREY,
  },
});
