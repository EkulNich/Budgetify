import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryEditorSheet } from "@/components/category/category-editor-sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { CATEGORIES } from "@/constants/categories";
import { Spacing } from "@/constants/theme";
import { useCategories } from "@/hooks/data/use-categories";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useTheme } from "@/hooks/use-theme";

export default function ManageCategoriesScreen() {
  const colors = useTheme();
  const { user } = useCurrentUser();
  const {
    personalCategories,
    createCategory,
    renameCategory,
    restoreCategory,
    archiveCategory,
  } = useCategories(user?.id);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    { id: number; label: string; icon: string; color: string } | null
  >(null);

  const activePersonal = personalCategories.filter((c) => !c.isArchived);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.backgroundElement} />
          </TouchableOpacity>
          <ThemedText type="title" style={{ color: colors.backgroundElement, fontSize: 20 }}>
            Manage Categories
          </ThemedText>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.sectionLabel, { color: colors.backgroundElement }]}>
            Built-in
          </ThemedText>
          {CATEGORIES.map((c) => (
            <View key={c.key} style={[styles.row, { backgroundColor: colors.backgroundElement + "10" }]}>
              <Ionicons name={c.icon} size={18} color={colors.backgroundElement} />
              <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
                {c.label}
              </ThemedText>
            </View>
          ))}

          <View style={styles.sectionHeaderRow}>
            <ThemedText style={[styles.sectionLabel, { color: colors.backgroundElement }]}>
              My Categories
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                setEditingCategory(null);
                setEditorVisible(true);
              }}
            >
              <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
                + Add
              </ThemedText>
            </TouchableOpacity>
          </View>
          {activePersonal.length === 0 ? (
            <ThemedText style={{ color: "#888" }}>
              No personal categories yet — add one to use it anywhere you log an expense.
            </ThemedText>
          ) : (
            activePersonal.map((c) => (
              <View
                key={c.id}
                style={[styles.row, { backgroundColor: colors.backgroundElement + "10" }]}
              >
                <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={18} color={c.color} />
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    setEditingCategory({ id: c.id, label: c.label, icon: c.icon, color: c.color });
                    setEditorVisible(true);
                  }}
                >
                  <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
                    {c.label}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.archiveBtn, { borderColor: "#C0392B" }]}
                  onPress={() => archiveCategory(c.id)}
                >
                  <ThemedText style={{ color: "#C0392B", fontWeight: "600", fontSize: 13 }}>
                    Archive
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        <CategoryEditorSheet
          visible={editorVisible}
          colors={colors}
          scope={{ type: "personal" }}
          editing={editingCategory}
          categories={personalCategories}
          createCategory={createCategory}
          renameCategory={renameCategory}
          restoreCategory={restoreCategory}
          onClose={() => setEditorVisible(false)}
          onSaved={() => {}}
          useNativeModal
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.four,
  },
  content: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.three,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
  },
  archiveBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
