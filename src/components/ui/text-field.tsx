import { forwardRef } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { Spacing } from "@/constants/theme";

/** The app's standard bordered text input. */
export const TextField = forwardRef<TextInput, TextInputProps>(
  function TextField({ style, placeholderTextColor = "#B0B4BA", ...rest }, ref) {
    return (
      <TextInput
        ref={ref}
        style={[styles.input, style]}
        placeholderTextColor={placeholderTextColor}
        {...rest}
      />
    );
  },
);

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
});
