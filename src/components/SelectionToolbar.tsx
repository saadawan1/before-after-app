import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants";
import { ActionButton } from "./ActionButton";

type SelectionToolbarProps = {
  count: number;
  onSelectAll: () => void;
  onDelete: () => void;
  onCancel: () => void;
};

export function SelectionToolbar({
  count,
  onSelectAll,
  onDelete,
  onCancel,
}: SelectionToolbarProps) {
  return (
    <View style={styles.toolbar}>
      <ActionButton
        label="Select All"
        onPress={onSelectAll}
        style={styles.selectAllButton}
        textStyle={styles.buttonText}
      />
      <Text style={styles.counter}>{count} selected</Text>
      <ActionButton
        label="Delete"
        onPress={onDelete}
        style={styles.dangerButton}
        textStyle={styles.buttonText}
      />
      <ActionButton
        label="Cancel"
        onPress={onCancel}
        style={styles.dangerButton}
        textStyle={styles.buttonText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-between",
    padding: 5,
  },
  selectAllButton: {
    backgroundColor: "#6b1a40",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  dangerButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  buttonText: { color: COLORS.white, fontSize: 12, fontWeight: "700" },
  counter: {
    color: COLORS.muted,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
  },
});
