import { StyleSheet, Switch, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { ThemeColors } from "@/constants/theme";

type ToggleRowProps = {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ThemeColors;
};

/** A settings row pairing a label + description with a Switch on the right. */
export function ToggleRow({ label, description, value, onValueChange, colors }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.label, { color: colors.backgroundElement }]}>
          {label}
        </ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D7D9DC", true: colors.backgroundElement }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  description: {
    fontSize: 12.5,
    color: "#9AA0A8",
    marginTop: 2,
  },
});
