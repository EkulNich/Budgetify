import { StyleSheet, View } from "react-native";

type IconBadgeProps = {
  children: React.ReactNode;
  color: string;
  size?: number;
};

/** A tinted circle used as an icon container — the small badge on stat cards, nav rows, etc. */
export function IconBadge({ children, color, size = 40 }: IconBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + "14",
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
