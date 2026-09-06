import { StyleSheet, View } from "react-native";

type PieSlice = { label: string; value: number; color: string };

/**
 * A pie chart drawn from many thin rotated View "slices" rather than SVG/canvas,
 * so it renders with plain React Native primitives on every platform.
 */
export function RotatedViewPieChart({ data }: { data: PieSlice[] }) {
  const size = 220;
  const radius = size / 2;
  const segmentCount = 240;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) return null;

  const cumulative: { end: number; color: string }[] = [];
  let runningTotal = 0;

  for (const item of data) {
    runningTotal += item.value / total;
    cumulative.push({ end: runningTotal, color: item.color });
  }

  return (
    <View style={[styles.pieChart, { width: size, height: size }]}>
      {Array.from({ length: segmentCount }, (_, index) => {
        const position = (index + 0.5) / segmentCount;
        const slice =
          cumulative.find((item) => position <= item.end) ??
          cumulative[cumulative.length - 1];

        return (
          <View
            key={index}
            pointerEvents="none"
            style={[
              styles.pieSegmentWrapper,
              {
                width: size,
                height: size,
                transform: [{ rotate: `${(index * 360) / segmentCount}deg` }],
              },
            ]}
          >
            <View
              style={[
                styles.pieSegment,
                {
                  left: radius,
                  top: radius - 1.5,
                  width: radius + 1,
                  backgroundColor: slice.color,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pieChart: {
    position: "relative",
    borderRadius: 110,
    overflow: "hidden",
  },
  pieSegmentWrapper: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  pieSegment: {
    position: "absolute",
    height: 3,
  },
});
