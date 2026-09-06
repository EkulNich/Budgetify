import { Modal, ScrollView, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";
import type { PoolMember } from "@/hooks/data/use-pool-members";
import { modalStyles } from "./modal-styles";

type InviteMemberModalProps = {
  visible: boolean;
  friends: { id: string; username: string }[];
  members: PoolMember[];
  colors: ThemeColors;
  onClose: () => void;
  onInvite: (friendId: string) => void;
};

export function InviteMemberModal({
  visible,
  friends,
  members,
  colors,
  onClose,
  onInvite,
}: InviteMemberModalProps) {
  const invitable = friends.filter(
    (f) => !members.some((m) => m.user_id === f.id),
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.modalOverlay}>
        <View style={[modalStyles.modalCard, { backgroundColor: "#fff" }]}>
          <ThemedText
            style={[modalStyles.modalTitle, { color: colors.backgroundElement }]}
          >
            Invite a Friend
          </ThemedText>
          <ScrollView style={{ maxHeight: 300 }}>
            {invitable.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={{
                  borderRadius: 12,
                  padding: Spacing.three,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: colors.backgroundElement + "15",
                  marginBottom: Spacing.two,
                }}
                onPress={() => onInvite(f.id)}
              >
                <ThemedText
                  style={{ color: colors.backgroundElement, fontWeight: "600" }}
                >
                  {f.username}
                </ThemedText>
              </TouchableOpacity>
            ))}
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
