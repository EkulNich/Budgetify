import { useEffect, useRef } from "react";
import { Animated, View, type ViewStyle } from "react-native";

type AnimatedProgressBarProps = {
  /** 0..1 */
  progress: number;
  color: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
};

/** A progress bar that smoothly animates its fill to a new width instead of snapping. */
export function AnimatedProgressBar({
  progress,
  color,
  trackColor = "#e0e0e0",
  height = 8,
  style,
}: AnimatedProgressBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const target = Math.max(0, Math.min(progress, 1)) * 100;
    Animated.timing(widthAnim, {
      toValue: target,
      duration: 600,
      // Layout properties like width can't use the native driver.
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          height: "100%",
          borderRadius: height / 2,
          backgroundColor: color,
          width: widthAnim.interpolate({
            inputRange: [0, 100],
            outputRange: ["0%", "100%"],
          }),
        }}
      />
    </View>
  );
}
