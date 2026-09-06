import { useRef, useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { CATEGORIES, type CategoryKey } from "@/constants/categories";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { insertExpense } from "@/hooks/data/use-expenses";
import { useTheme } from "@/hooks/use-theme";

export default function AddScreen() {
  const { user } = useCurrentUser();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const colors = useTheme();
  const descriptionRef = useRef<TextInput>(null);

  const handleAdd = async () => {
    if (!amount) {
      Alert.alert("Missing info", "Please enter an amount.");
      return;
    }
    if (!category) {
      Alert.alert("Missing info", "Please pick a category.");
      return;
    }
    if (category === "others" && !description.trim()) {
      Alert.alert("Missing info", "Please describe the expense.");
      return;
    }
    if (!user) {
      Alert.alert("Error", "Not logged in");
      return;
    }

    setLoading(true);
    try {
      await insertExpense(user.id, {
        amount: parseFloat(amount),
        category,
        description: category === "others" ? description.trim() : null,
      });
      Alert.alert("Saved!", "Expense added.");
      setAmount("");
      setDescription("");
      setCategory(null);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={{ color: colors.backgroundElement }}>
          Add Expense
        </ThemedText>

        <ThemedText type="small">Category</ThemedText>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => {
            const selected = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={[
                  styles.chip,
                  selected && {
                    backgroundColor: "#2D612A",
                    borderColor: "#2D612A",
                  },
                ]}
              >
                <ThemedText style={{ color: selected ? "white" : "#333" }}>
                  {c.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextField
          style={{ color: "black" }}
          placeholder="Amount"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          returnKeyType={category === "others" ? "next" : "done"}
          onSubmitEditing={() => {
            if (category === "others") descriptionRef.current?.focus();
          }}
        />

        {category === "others" && (
          <TextField
            ref={descriptionRef}
            style={{ color: "black" }}
            placeholder="Describe the expense"
            value={description}
            onChangeText={setDescription}
            returnKeyType="done"
          />
        )}

        <PrimaryButton label="Add Expense" onPress={handleAdd} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "white",
  },
});
