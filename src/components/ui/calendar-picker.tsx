import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateKey(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

type CalendarPickerProps = {
  /** "YYYY-MM-DD", or null if no date is selected. */
  selectedDate: string | null;
  /** "YYYY-MM-DD" dates that have at least one expense — shown with a dot. */
  markedDates: Set<string>;
  colors: ThemeColors;
  onSelectDate: (date: string) => void;
};

/** A simple month-grid date picker, built from plain Views (no calendar library). */
export function CalendarPicker({
  selectedDate,
  markedDates,
  colors,
  onSelectDate,
}: CalendarPickerProps) {
  const initial = selectedDate
    ? new Date(selectedDate + "T00:00:00")
    : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const moveMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = firstOfMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Previous month"
          style={styles.navButton}
          onPress={() => moveMonth(-1)}
        >
          <ThemedText style={[styles.navArrow, { color: colors.backgroundElement }]}>
            ‹
          </ThemedText>
        </TouchableOpacity>
        <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
          {monthLabel}
        </ThemedText>
        <TouchableOpacity
          accessibilityLabel="Next month"
          style={styles.navButton}
          onPress={() => moveMonth(1)}
        >
          <ThemedText style={[styles.navArrow, { color: colors.backgroundElement }]}>
            ›
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={styles.cell}>
            <ThemedText type="small" style={{ color: "#888" }}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.weekRow}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (day === null) {
              return <View key={col} style={styles.cell} />;
            }

            const dateKey = toDateKey(viewYear, viewMonth, day);
            const isSelected = dateKey === selectedDate;
            const hasExpenses = markedDates.has(dateKey);

            return (
              <TouchableOpacity
                key={col}
                style={styles.cell}
                onPress={() => onSelectDate(dateKey)}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && { backgroundColor: colors.backgroundElement },
                  ]}
                >
                  <ThemedText
                    style={{
                      color: isSelected ? "#fff" : colors.backgroundElement,
                      fontSize: 14,
                    }}
                  >
                    {day}
                  </ThemedText>
                </View>
                {hasExpenses && !isSelected && (
                  <View
                    style={[styles.dot, { backgroundColor: colors.backgroundElement }]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: { fontSize: 22, lineHeight: 24 },
  weekRow: { flexDirection: "row" },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
