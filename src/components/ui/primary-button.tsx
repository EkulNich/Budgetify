import {
  StyleSheet,
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";

type PrimaryButtonProps = TouchableOpacityProps & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "danger";
};

/** The app's standard full-width action button, with a built-in loading/disabled state. */
export function PrimaryButton({
  label,
  loading = false,
  variant = "primary",
  style,
  disabled,
  ...rest
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === "danger" && styles.danger,
        (loading || disabled) && styles.disabled,
        style,
      ]}
      disabled={loading || disabled}
      {...rest}
    >
      <ThemedText style={styles.label}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#2D612A",
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: "center",
  },
  danger: {
    backgroundColor: "#e55",
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: "white",
  },
});
