import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";

/** Shared shell styles for the pool detail screen's bottom-sheet modals. */
export const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: Spacing.two },
  btn: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  closeBtn: {
    backgroundColor: "#e0e0e0",
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: "center",
  },
});
