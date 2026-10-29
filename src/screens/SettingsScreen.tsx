import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { DrawerScreenProps } from "@react-navigation/drawer";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionButton } from "../components/ActionButton";
import { FormCard, formStyles } from "../components/FormCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { TagField } from "../components/TagField";
import { COLORS } from "../constants";
import { useAppPreferences } from "../context/AppPreferencesContext";
import type { RootDrawerParamList } from "../types";

const SWITCH_TRACK_COLORS = { true: "#a5d6a7", false: "#ccc" };

type SettingsScreenProps = DrawerScreenProps<RootDrawerParamList, "Settings">;
type PreferenceName = "showTag" | "sameTagForAll";

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const {
    info,
    saveInfo,
    showTag,
    saveShowTag,
    sameTagForAll,
    saveSameTagForAll,
  } = useAppPreferences();
  const [tag, setTag] = useState(info?.tag || "");
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [pendingPreference, setPendingPreference] = useState<PreferenceName | null>(null);

  useEffect(() => setTag(info?.tag || ""), [info]);

  const save = async () => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      Alert.alert("Required", "Please enter an image tag.");
      return;
    }

    setIsSavingTag(true);
    try {
      const updatedInfo = { tag: trimmedTag };
      await saveInfo(updatedInfo);
      Alert.alert("Success", "Settings updated successfully.");
    } catch (error) {
      Alert.alert("Save failed", "Could not update settings. Please retry.");
      console.error("Could not save settings:", error);
    } finally {
      setIsSavingTag(false);
    }
  };

  const updatePreference = async (
    name: PreferenceName,
    value: boolean,
    persist: (nextValue: boolean) => Promise<void>,
  ) => {
    setPendingPreference(name);
    try {
      await persist(value);
    } catch (error) {
      Alert.alert("Save failed", "Could not update this preference.");
      console.error("Could not save preference:", error);
    } finally {
      setPendingPreference(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScreenHeader navigation={navigation} title="⚙️ Settings" />
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
            title="⚙️ Settings"
            subtitle="Update your image tag and display preferences"
          >
            <TagField value={tag} onChangeText={setTag} />
            <ActionButton
              disabled={isSavingTag}
              label={isSavingTag ? "Saving…" : "Save Changes"}
              onPress={save}
              style={formStyles.saveButton}
              textStyle={formStyles.saveButtonText}
            />

            <PreferenceRow label="Show Tag on Card">
              <Switch
                accessibilityLabel="Show tag on card"
                disabled={pendingPreference !== null}
                value={showTag}
                onValueChange={(value) =>
                  updatePreference("showTag", value, saveShowTag)
                }
                thumbColor={COLORS.primary}
                trackColor={SWITCH_TRACK_COLORS}
              />
            </PreferenceRow>

            <PreferenceRow
              label="Same Tag for All Images"
              helper={
                !sameTagForAll
                  ? "You can write a custom tag on each card"
                  : ""
              }
            >
              <Switch
                accessibilityLabel="Use the same tag for all images"
                disabled={pendingPreference !== null}
                value={sameTagForAll}
                onValueChange={(value) =>
                  updatePreference(
                    "sameTagForAll",
                    value,
                    saveSameTagForAll,
                  )
                }
                thumbColor={COLORS.primary}
                trackColor={SWITCH_TRACK_COLORS}
              />
            </PreferenceRow>
          </FormCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type PreferenceRowProps = {
  label: string;
  helper?: string;
  children: ReactNode;
};

function PreferenceRow({ label, helper, children }: PreferenceRowProps) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceText}>
        <Text style={formStyles.label}>{label}</Text>
        {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 20 },
  preferenceRow: {
    alignItems: "center",
    borderTopColor: "#eee",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingVertical: 12,
  },
  preferenceText: { flex: 1 },
  helper: { color: COLORS.muted, fontSize: 13 },
});
