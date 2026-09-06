import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import type { ThemeColors } from "@/constants/theme";

type PoolHeaderProps = {
  name: string | undefined;
  canRename: boolean;
  colors: ThemeColors;
  onBack: () => void;
  onRenamePress: () => void;
};

/** The pool detail screen's top bar: back button + the pool name (tappable to rename by its owner). */
export function PoolHeader({
  name,
  canRename,
  colors,
  onBack,
  onRenamePress,
}: PoolHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={{ width: 70 }} onPress={onBack}>
        <ThemedText
          style={{
            color: colors.backgroundElement,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          ← Back
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => canRename && onRenamePress()}
        style={{ flex: 1, alignItems: "center" }}
        disabled={!canRename}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            color: colors.backgroundElement,
            fontSize: 32,
            fontWeight: "700",
            textAlign: "center",
            textDecorationLine: canRename ? "underline" : "none",
          }}
        >
          {name}
        </Text>
      </TouchableOpacity>
      <View style={{ width: 70 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
});
