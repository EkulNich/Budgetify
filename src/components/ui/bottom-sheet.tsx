import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
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

type BottomSheetProps = {
  visible: boolean;
  title: string;
  colors: ThemeColors;
  onClose: () => void;
  children: ReactNode;
  /**
   * Renders inside a real native `Modal` instead of a plain overlay `View`.
   *
   * Required whenever this sheet is opened directly on a tab screen (nothing
   * else already covering it) — a plain `View`, however high its zIndex, is
   * still confined inside that tab's content area, and iOS's native tab bar
   * is a completely separate rendering layer that always paints on top of it,
   * making the sheet (and anything near its bottom edge) physically covered
   * by the tab bar and untappable.
   *
   * Leave this false when the sheet is already opened from inside another
   * `Modal` (e.g. "Add Expense") — that outer `Modal` already covers the tab
   * bar itself, and stacking a second native `Modal` inside it can leave the
   * app's touch input dead after the inner one closes.
   */
  useNativeModal?: boolean;
  /**
   * Wraps the sheet in a `KeyboardAvoidingView` so a focused text input isn't
   * covered when the keyboard opens. Default true — turn this off when the
   * sheet is already nested inside a caller that provides its own (nesting
   * two can double the keyboard offset).
   */
  avoidKeyboard?: boolean;
};

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

/**
 * The app's default bottom sheet chrome: a dimmed backdrop, a card that
 * slides up from the bottom, a drag handle + title + close ("x") button
 * header, and three ways to dismiss — tap the backdrop, tap the "x", or drag
 * the sheet down. Any new sheet-style UI in the app should build on this
 * instead of hand-rolling its own overlay, so dismissal and tab-bar-covering
 * behavior stay consistent everywhere.
 */
export function BottomSheet({
  visible,
  title,
  colors,
  onClose,
  children,
  useNativeModal = false,
  avoidKeyboard = true,
}: BottomSheetProps) {
  const translateY = useSharedValue(0);

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

  const sheet = (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

      <Animated.View style={[modalStyles.modalCard, { backgroundColor: "#fff" }, animatedStyle]}>
        {/* Only the handle/header is draggable, so dragging content below (e.g. a list) still scrolls it. */}
        <GestureDetector gesture={panGesture}>
          <View>
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <ThemedText style={[modalStyles.modalTitle, { color: colors.backgroundElement }]}>
                {title}
              </ThemedText>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.backgroundElement} />
              </TouchableOpacity>
            </View>
          </View>
        </GestureDetector>

        {children}
      </Animated.View>
    </View>
  );

  const content = avoidKeyboard ? (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      {sheet}
    </KeyboardAvoidingView>
  ) : (
    sheet
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
});
