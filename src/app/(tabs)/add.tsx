import { supabase } from "@/lib/supabase";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";
import { useRef } from "react";

const CATEGORIES = [
  { key: "food", label: "Food" },
  { key: "transport", label: "Transport" },
  { key: "entertainment", label: "Entertainment" },
  { key: "loans", label: "Loans" },
  { key: "others", label: "Others" },
];

type CategoryKey = (typeof CATEGORIES)[number]["key"];

export default function AddScreen() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];
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
    console.log("Adding expense:", { amount: parseFloat(amount), description });

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Error", "Not logged in");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("expenses").insert([
      {
        amount: parseFloat(amount),
        description: category === "others" ? description.trim() : null,
        category,
        user_id: user.id,
      },
    ]);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Saved!", "Expense added.");
      setAmount("");
      setDescription("");
      setCategory(null);
    }

    setLoading(false);
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

        <TextInput
          style={[styles.input, { color: "black" }]}
          placeholder="Amount"
          placeholderTextColor="#B0B4BA"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          returnKeyType={category === "others" ? "next" : "done"}
          onSubmitEditing={() => {
            if (category === "others") descriptionRef.current?.focus();
          }}
        />

        {category === "others" && (
          <TextInput
            ref={descriptionRef}
            style={[styles.input, { color: "black" }]}
            placeholder="Describe the expense"
            placeholderTextColor="#B0B4BA"
            value={description}
            onChangeText={setDescription}
            returnKeyType="done"
          />
        )}

        <TouchableOpacity style={styles.button} onPress={handleAdd}>
          <ThemedText style={{ color: "white" }}>Add Expense</ThemedText>
        </TouchableOpacity>
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
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2D612A",
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: "center",
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
