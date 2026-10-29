import { useState } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { COLORS } from "../constants";
import { ActionButton } from "./ActionButton";

type PerCardTagInputProps = {
  initialTag: string;
  onSave: (tag: string) => Promise<unknown>;
};

export function PerCardTagInput({ initialTag, onSave }: PerCardTagInputProps) {
  const [tag, setTag] = useState(initialTag);
  const [isEditing, setIsEditing] = useState(!initialTag);

  const save = async () => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    try {
      await onSave(trimmedTag);
      setTag(trimmedTag);
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Save failed", "Could not save this card tag.");
      console.error("Could not save card tag:", error);
    }
  };

  if (!isEditing) {
    return (
      <View style={styles.wrapper}>
        <ActionButton
          label="Edit Tag"
          onPress={() => setIsEditing(true)}
          style={styles.editButton}
          textStyle={styles.buttonText}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        value={tag}
        onChangeText={setTag}
        placeholder="Enter tag for this card..."
        placeholderTextColor="#999"
      />
      <ActionButton
        label="Save Tag"
        onPress={save}
        style={styles.saveButton}
        textStyle={styles.buttonText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: COLORS.white, padding: 10 },
  input: {
    borderColor: "#ddd",
    borderRadius: 6,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 14,
    padding: 8,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    marginTop: 6,
    padding: 10,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: "#ff9800",
    borderRadius: 6,
    padding: 10,
  },
  buttonText: { color: COLORS.white, fontSize: 13, fontWeight: "600" },
});
