import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";
import { modalStyles } from "./modal-styles";

export type SelectOption = { value: string; label: string };

type SelectModalProps = {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  colors: ThemeColors;
  onSelect: (value: string) => void;
  onClose: () => void;
};

/** A bottom-sheet list picker for choosing one of several string-keyed options. */
export function SelectModal({
  visible,
  title,
  options,
  selectedValue,
  colors,
  onSelect,
  onClose,
}: SelectModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.modalOverlay}>
        <View style={[modalStyles.modalCard, { backgroundColor: "#fff" }]}>
          <ThemedText
            style={[modalStyles.modalTitle, { color: colors.backgroundElement }]}
          >
            {title}
          </ThemedText>
          <ScrollView style={{ maxHeight: 320 }}>
            {options.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    selected && { backgroundColor: colors.backgroundElement + "15" },
                  ]}
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
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
            <ThemedText style={{ color: "#333", fontWeight: "600", fontSize: 14 }}>
              Close
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  option: {
    padding: Spacing.three,
    borderRadius: 12,
  },
});
