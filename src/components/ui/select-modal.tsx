import { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";
import { BottomSheet } from "./bottom-sheet";

export type SelectOption = { value: string; label: string };

type SelectModalProps = {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  colors: ThemeColors;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Moves the currently selected option to the top of the list. */
  sortSelectedFirst?: boolean;
  /**
   * Renders inside a real native `Modal` instead of a plain overlay `View`.
   *
   * Required whenever this picker is opened directly on a tab screen (nothing
   * else already covering it) — a plain `View`, however high its zIndex, is
   * still confined inside that tab's content area, and iOS's native tab bar
   * is a completely separate rendering layer that always paints on top of it,
   * making anything positioned there (like a picker's last few options)
   * physically covered by the tab bar and untappable.
   *
   * Leave this false when the picker is already opened from inside another
   * `Modal` (e.g. "New Pool", "Add Expense") — that outer `Modal` already
   * covers the tab bar itself, and stacking a second native `Modal` inside it
   * can leave the app's touch input dead after the inner one closes.
   */
  useNativeModal?: boolean;
};

/**
 * A bottom-sheet list picker for choosing one of several string-keyed options.
 * Dismisses via the X button, dragging the sheet down, or tapping the dimmed
 * backdrop.
 */
export function SelectModal({
  visible,
  title,
  options,
  selectedValue,
  colors,
  onSelect,
  onClose,
  sortSelectedFirst = false,
  useNativeModal = false,
}: SelectModalProps) {
  const orderedOptions = useMemo(() => {
    if (!sortSelectedFirst) return options;
    const selected = options.find((o) => o.value === selectedValue);
    if (!selected) return options;
    return [selected, ...options.filter((o) => o.value !== selectedValue)];
  }, [options, selectedValue, sortSelectedFirst]);

  return (
    <BottomSheet
      visible={visible}
      title={title}
      colors={colors}
      onClose={onClose}
      useNativeModal={useNativeModal}
      avoidKeyboard={false}
    >
      <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: Spacing.three }}>
        {orderedOptions.map((option) => {
          const selected = option.value === selectedValue;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, selected && { backgroundColor: colors.backgroundElement + "15" }]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <ThemedText
                style={{
                  color: colors.backgroundElement,
                  fontWeight: selected ? "700" : "500",
                }}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    padding: Spacing.three,
    borderRadius: 12,
  },
});
