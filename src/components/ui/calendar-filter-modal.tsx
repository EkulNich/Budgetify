import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { modalStyles } from "@/components/ui/modal-styles";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";

type CalendarFilterModalProps = {
  visible: boolean;
  selectedDate: string | null;
  markedDates: Set<string>;
  colors: ThemeColors;
  onSelectDate: (date: string | null) => void;
  onClose: () => void;
};

/**
 * A bottom-sheet calendar for filtering a list down to one date.
 *
 * A plain overlay (not React Native's `Modal`), same as `SelectModal` — this is
 * meant to be opened from inside a screen that's already showing its own
 * `Modal`, and stacking two native Modals leaves the app's touch input dead
 * after the inner one closes. See `SelectModal` for the full rationale.
 */
export function CalendarFilterModal({
  visible,
  selectedDate,
  markedDates,
  colors,
  onSelectDate,
  onClose,
}: CalendarFilterModalProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[modalStyles.modalCard, { backgroundColor: "#fff" }]}>
        <View style={styles.titleRow}>
          <ThemedText
            style={[modalStyles.modalTitle, { color: colors.backgroundElement }]}
          >
            Filter by date
          </ThemedText>
          {selectedDate && (
            <TouchableOpacity
              onPress={() => {
                onSelectDate(null);
                onClose();
              }}
            >
              <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
                Show All
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <CalendarPicker
          selectedDate={selectedDate}
          markedDates={markedDates}
          colors={colors}
          onSelectDate={(date) => {
            onSelectDate(date);
            onClose();
          }}
        />

        <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
          <ThemedText style={{ color: "#333", fontWeight: "600", fontSize: 14 }}>
            Close
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
    zIndex: 1000,
    elevation: 1000,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
});
