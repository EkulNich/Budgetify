import { useRef } from "react";
import {
  Alert,
  Animated,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { ThemedText } from "@/components/themed-text";

type SwipeableRowProps = {
  children: React.ReactNode;
  onDelete: () => void;
  confirmTitle: string;
  confirmMessage: string;
  enabled?: boolean;
  /** Slides the delete button in alongside the swipe, rather than a plain Swipeable reveal. */
  animateDeleteButton?: boolean;
  deleteButtonStyle?: ViewStyle;
};

/** A row with a swipe-to-reveal "Delete" action, gated behind a confirmation alert. */
export function SwipeableRow({
  children,
  onDelete,
  confirmTitle,
  confirmMessage,
  enabled = true,
  animateDeleteButton = false,
  deleteButtonStyle,
}: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const handlePress = () => {
    swipeableRef.current?.close();
    Alert.alert(confirmTitle, confirmMessage, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const button = (
      <TouchableOpacity
        style={[styles.deleteBtn, deleteButtonStyle]}
        onPress={handlePress}
      >
        <ThemedText style={styles.deleteLabel}>Delete</ThemedText>
      </TouchableOpacity>
    );

    if (!animateDeleteButton) return button;

    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    return (
      <Animated.View
        style={[styles.deleteAction, { transform: [{ translateX }] }]}
      >
        {button}
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={enabled ? renderRightActions : undefined}
      rightThreshold={40}
      enabled={enabled}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginVertical: 0,
  },
  deleteBtn: {
    backgroundColor: "#e55",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  deleteLabel: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
});
