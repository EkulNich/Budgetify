import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

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

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

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
  const translateY = useSharedValue(0);

  const orderedOptions = useMemo(() => {
    if (!sortSelectedFirst) return options;
    const selected = options.find((o) => o.value === selectedValue);
    if (!selected) return options;
    return [selected, ...options.filter((o) => o.value !== selectedValue)];
  }, [options, selectedValue, sortSelectedFirst]);

  const close = () => {
    translateY.value = 0;
    onClose();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(800, { duration: 200 }, (finished) => {
          if (finished) runOnJS(close)();
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  const content = (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

      <Animated.View
        style={[modalStyles.modalCard, { backgroundColor: "#fff" }, animatedStyle]}
      >
        {/* Only the handle/header is draggable, so dragging the list below still scrolls it. */}
        <GestureDetector gesture={panGesture}>
          <View>
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <ThemedText
                style={[modalStyles.modalTitle, { color: colors.backgroundElement }]}
              >
                {title}
              </ThemedText>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.backgroundElement} />
              </TouchableOpacity>
            </View>
          </View>
        </GestureDetector>

        <ScrollView
          style={{ maxHeight: 320 }}
          contentContainerStyle={{ paddingBottom: Spacing.three }}
        >
          {orderedOptions.map((option) => {
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
      </Animated.View>
    </View>
  );

  if (useNativeModal) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        {/* RN's Modal mounts a separate native root, so gesture-handler needs its own provider here too. */}
        <GestureHandlerRootView style={{ flex: 1 }}>{content}</GestureHandlerRootView>
      </Modal>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
    zIndex: 1000,
    elevation: 1000,
  },
  dragHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D7D9DC",
    marginBottom: Spacing.one,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  option: {
    padding: Spacing.three,
    borderRadius: 12,
  },
});
