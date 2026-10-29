import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionButton } from "../components/ActionButton";
import { FormCard, formStyles } from "../components/FormCard";
import { TagField } from "../components/TagField";
import { COLORS } from "../constants";
import type { AppInfo } from "../types";

type SetupScreenProps = {
  onSave: (info: AppInfo) => Promise<void>;
};

export function SetupScreen({ onSave }: SetupScreenProps) {
  const [tag, setTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      Alert.alert("Required", "Please enter an image tag.");
      return;
    }

    setIsSaving(true);
    try {
      const info = { tag: trimmedTag };
      await onSave(info);
    } catch (error) {
      Alert.alert("Save failed", "Could not save the image tag. Please retry.");
      console.error("Could not save setup:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.fill}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          <FormCard
            title="⚙ App Setup"
            subtitle="This tag will appear on all your images."
          >
            <TagField value={tag} onChangeText={setTag} />
            <ActionButton
              disabled={isSaving}
              label={isSaving ? "Saving…" : "Save & Continue →"}
              onPress={save}
              style={formStyles.saveButton}
              textStyle={formStyles.saveButtonText}
            />
          </FormCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.primary, flex: 1 },
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 20 },
});
