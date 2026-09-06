import { StyleSheet } from "react-native";

import { ThemedText, type ThemedTextProps } from "@/components/themed-text";

/** A small, uppercase section heading used above form groups and lists. */
export function SectionLabel({ style, ...rest }: ThemedTextProps) {
  return <ThemedText style={[styles.label, style]} {...rest} />;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
