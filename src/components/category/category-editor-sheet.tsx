import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { modalStyles } from "@/components/ui/modal-styles";
import { CUSTOM_CATEGORY_COLORS } from "@/constants/categories";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";
import type { Category, CategoryScope } from "@/hooks/data/use-categories";
import { CategoryValidationError } from "@/lib/category-validation";

const ICON_OPTIONS = [
  "barbell-outline",
  "cafe-outline",
  "school-outline",
  "repeat-outline",
  "gift-outline",
  "paw-outline",
  "airplane-outline",
  "home-outline",
  "medkit-outline",
  "cart-outline",
  "wifi-outline",
  "call-outline",
  "film-outline",
  "musical-notes-outline",
  "basketball-outline",
  "storefront-outline",
  "bulb-outline",
  "cut-outline",
  "shield-checkmark-outline",
  "book-outline",
  "heart-outline",
  "briefcase-outline",
  "bed-outline",
  "flash-outline",
] as const;

type EditingCategory = { id: number; label: string; icon: string; color: string };

type CategoryEditorSheetProps = {
  visible: boolean;
  colors: ThemeColors;
  scope: CategoryScope;
  /** Present = editing that category; absent = creating a new one. */
  editing?: EditingCategory | null;
  /** Every category (active + archived) in this scope — used to resolve an archived duplicate's label for the Restore offer. */
  categories: Category[];
  createCategory: (
    scope: CategoryScope,
    label: string,
    icon: string,
    color: string,
  ) => Promise<string>;
  renameCategory: (id: number, label: string, icon?: string, color?: string) => Promise<void>;
  restoreCategory: (id: number, updates?: { icon?: string; color?: string }) => Promise<void>;
  onClose: () => void;
  /** Called with the saved/restored category's picker key (`custom:<id>`) once it's ready to select. */
  onSaved: (key: string) => void;
  /**
   * Set this when the sheet is opened directly on a tab screen (nothing else
   * already covering it) — see {@link BottomSheet}'s doc comment. Leave it
   * false when nested inside another `Modal` (e.g. "Add Expense").
   */
  useNativeModal?: boolean;
  /** Turn off when nested inside a caller that already wraps its content in its own `KeyboardAvoidingView`. */
  avoidKeyboard?: boolean;
};

/** Create or edit a personal/pool category — name, icon, and color. */
export function CategoryEditorSheet({
  visible,
  colors,
  scope,
  editing,
  categories,
  createCategory,
  renameCategory,
  restoreCategory,
  onClose,
  onSaved,
  useNativeModal = false,
  avoidKeyboard = true,
}: CategoryEditorSheetProps) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState<string>(ICON_OPTIONS[0]);
  const [color, setColor] = useState<string>(CUSTOM_CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLabel(editing?.label ?? "");
    setIcon(editing?.icon ?? ICON_OPTIONS[0]);
    setColor(editing?.color ?? CUSTOM_CATEGORY_COLORS[0]);
  }, [visible, editing]);

  if (!visible) return null;

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert("Missing name", "Please enter a category name.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await renameCategory(editing.id, label.trim(), icon, color);
        onSaved(label.trim().toLowerCase());
      } else {
        const name = await createCategory(scope, label.trim(), icon, color);
        onSaved(name);
      }
      onClose();
    } catch (error) {
      if (error instanceof CategoryValidationError) {
        const check = error.check;
        if (check.reason === "duplicate_archived") {
          const archived = categories.find((c) => c.id === check.archivedId);
          Alert.alert(
            "Category archived",
            `You already archived a category called "${archived?.label ?? label}". Restore it instead?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Restore",
                onPress: async () => {
                  try {
                    await restoreCategory(check.archivedId, { icon, color });
                    onSaved(archived?.name ?? label.trim().toLowerCase());
                    onClose();
                  } catch (restoreError) {
                    Alert.alert("Error", (restoreError as Error).message);
                  }
                },
              },
            ],
          );
        } else if (check.reason === "alias_conflict") {
          Alert.alert(
            "Name unavailable",
            `That name was previously used by "${check.currentLabel}" — pick a different one.`,
          );
        } else if (check.reason === "duplicate_active") {
          Alert.alert("Name taken", "You already have a category with that name.");
        } else if (check.reason === "reserved") {
          Alert.alert("Name reserved", "That name is used by a built-in category.");
        } else {
          Alert.alert("Invalid name", "Please choose a shorter or longer name.");
        }
      } else {
        Alert.alert("Error", (error as Error).message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={editing ? "Edit Category" : "New Category"}
      colors={colors}
      onClose={onClose}
      useNativeModal={useNativeModal}
      avoidKeyboard={avoidKeyboard}
    >
      <TextInput
        style={[modalStyles.input, { borderColor: colors.backgroundElement, color: colors.backgroundElement }]}
        placeholder="Category name"
        placeholderTextColor="#9AA0A8"
        value={label}
        onChangeText={setLabel}
        maxLength={30}
      />

      <ThemedText style={[styles.sectionLabel, { color: colors.backgroundElement }]}>Icon</ThemedText>
      <ScrollView contentContainerStyle={styles.iconGrid}>
        {ICON_OPTIONS.map((iconName) => {
          const selected = icon === iconName;
          return (
            <TouchableOpacity
              key={iconName}
              style={[
                styles.iconOption,
                { borderColor: colors.backgroundElement },
                selected && { backgroundColor: colors.backgroundElement },
              ]}
              onPress={() => setIcon(iconName)}
            >
              <Ionicons name={iconName} size={20} color={selected ? "#fff" : colors.backgroundElement} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ThemedText style={[styles.sectionLabel, { color: colors.backgroundElement }]}>Color</ThemedText>
      <View style={styles.colorRow}>
        {CUSTOM_CATEGORY_COLORS.map((swatch) => {
          const selected = color === swatch;
          return (
            <TouchableOpacity
              key={swatch}
              style={[styles.colorSwatch, { backgroundColor: swatch }, selected && styles.colorSwatchSelected]}
              onPress={() => setColor(swatch)}
            />
          );
        })}
      </View>

      <View style={modalStyles.row}>
        <TouchableOpacity style={[modalStyles.btn, { backgroundColor: "#e0e0e0" }]} onPress={onClose}>
          <ThemedText style={{ color: "#333", fontWeight: "600", fontSize: 14 }}>Cancel</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[modalStyles.btn, { backgroundColor: colors.backgroundElement }]}
          onPress={handleSave}
          disabled={saving}
        >
          <ThemedText style={modalStyles.btnText}>{saving ? "Saving..." : "Save"}</ThemedText>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: "#23262B",
  },
});
