import { useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SectionLabel } from "@/components/ui/section-label";
import { TextField } from "@/components/ui/text-field";
import { Spacing } from "@/constants/theme";
import { calculateHoursNeeded, getWorkBreakdown } from "@/lib/hours";

const TEXT_GREY = "#7A7F87";
const PRIMARY_GREEN = "#2D612A";

type HoursCalculatorProps = {
  savedSalary: number | null;
  savedHours: number | null;
  scrollViewRef: React.RefObject<ScrollView | null>;
};

/** "How long do I need to work for..." — converts a dollar amount into hours/days/minutes of work. */
export function HoursCalculator({
  savedSalary,
  savedHours,
  scrollViewRef,
}: HoursCalculatorProps) {
  const [expenseAmount, setExpenseAmount] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState<number | null>(null);
  const resultYRef = useRef<number | null>(null);

  const handleCalculate = () => {
    const amount = parseFloat(expenseAmount);

    if (!savedSalary || !savedHours) {
      Alert.alert(
        "Error",
        "Please save your salary and hours in the Profile tab first.",
      );
      return;
    }

    if (!amount || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    Keyboard.dismiss();
    resultYRef.current = null;
    setHoursNeeded(calculateHoursNeeded(amount, savedSalary, savedHours));
  };

  return (
    <>
      <SectionLabel style={{ color: TEXT_GREY }}>
        How long do I need to work for...
      </SectionLabel>

      <TextField
        style={styles.input}
        placeholder="Enter amount"
        keyboardType="numeric"
        value={expenseAmount}
        onChangeText={(value) => {
          setExpenseAmount(value);
          setHoursNeeded(null);
        }}
        onFocus={() => {
          setTimeout(
            () => scrollViewRef.current?.scrollToEnd({ animated: true }),
            150,
          );
        }}
        returnKeyType="done"
      />

      <TouchableOpacity style={styles.button} onPress={handleCalculate}>
        <ThemedText style={styles.buttonText}>Calculate</ThemedText>
      </TouchableOpacity>

      {hoursNeeded !== null &&
        (() => {
          const { minutes, hours, days } = getWorkBreakdown(
            hoursNeeded,
            savedHours,
          );

          return (
            <ThemedView
              style={styles.resultCard}
              onLayout={({ nativeEvent: { layout } }) => {
                // Copy the numeric position immediately. React may release the
                // synthetic event before the delayed callback runs.
                const resultY = layout.y;
                resultYRef.current = resultY;

                // Allow the keyboard dismissal and layout update to finish,
                // then bring the completed calculation into view.
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({
                    y: Math.max(0, resultY - Spacing.three),
                    animated: true,
                  });
                }, 200);
              }}
            >
              <ThemedText style={styles.resultLabel}>
                You need to work
              </ThemedText>

              <ThemedView style={styles.resultRow}>
                {days > 0 && (
                  <ThemedView style={styles.resultUnit}>
                    <ThemedText style={styles.resultValue}>{days}</ThemedText>
                    <ThemedText style={styles.resultUnitLabel}>
                      {days === 1 ? "day" : "days"}
                    </ThemedText>
                  </ThemedView>
                )}

                {hours > 0 && (
                  <ThemedView style={styles.resultUnit}>
                    <ThemedText style={styles.resultValue}>{hours}</ThemedText>
                    <ThemedText style={styles.resultUnitLabel}>
                      {hours === 1 ? "hour" : "hours"}
                    </ThemedText>
                  </ThemedView>
                )}

                {minutes > 0 && (
                  <ThemedView style={styles.resultUnit}>
                    <ThemedText style={styles.resultValue}>
                      {minutes}
                    </ThemedText>
                    <ThemedText style={styles.resultUnitLabel}>
                      {minutes === 1 ? "min" : "mins"}
                    </ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
            </ThemedView>
          );
        })()}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderColor: "#D7D9DC",
    color: TEXT_GREY,
  },
  button: {
    backgroundColor: PRIMARY_GREEN,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF" },
  resultCard: {
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: "#D7D9DC",
  },
  resultLabel: { fontSize: 16, color: TEXT_GREY },
  resultRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.four,
    paddingBottom: 16,
  },
  resultUnit: { alignItems: "center", gap: 4 },
  resultValue: {
    fontSize: 52,
    fontWeight: "700",
    color: PRIMARY_GREEN,
    lineHeight: 64,
  },
  resultUnitLabel: { fontSize: 14, color: TEXT_GREY },
});
