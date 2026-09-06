import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { ThemeColors } from "@/constants/theme";
import { modalStyles } from "./modal-styles";

type RenamePoolModalProps = {
  visible: boolean;
  currentName: string | undefined;
  colors: ThemeColors;
  onClose: () => void;
  onSubmit: (newName: string) => Promise<void>;
};

export function RenamePoolModal({
  visible,
  currentName,
  colors,
  onClose,
  onSubmit,
}: RenamePoolModalProps) {
  const [newPoolName, setNewPoolName] = useState("");

  const handleSave = async () => {
    if (!newPoolName.trim()) return;
    await onSubmit(newPoolName.trim());
    setNewPoolName("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={modalStyles.modalOverlay}
      >
        <View style={[modalStyles.modalCard, { backgroundColor: "#fff" }]}>
          <ThemedText
            style={[modalStyles.modalTitle, { color: colors.backgroundElement }]}
          >
            Rename Pool
          </ThemedText>
          <TextInput
            style={[
              modalStyles.input,
              { borderColor: colors.backgroundElement, color: colors.backgroundElement },
            ]}
            placeholder={currentName ?? "New name"}
            placeholderTextColor="#888"
            value={newPoolName}
            onChangeText={setNewPoolName}
            maxLength={20}
            autoFocus
          />
          <View style={modalStyles.row}>
            <TouchableOpacity
              style={[modalStyles.btn, { backgroundColor: "#e0e0e0" }]}
              onPress={onClose}
            >
              <ThemedText style={{ color: "#333", fontWeight: "600", fontSize: 14 }}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.btn, { backgroundColor: colors.backgroundElement }]}
              onPress={handleSave}
            >
              <ThemedText style={modalStyles.btnText}>Save</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
