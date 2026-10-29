import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants";
import type { AppNavigation } from "../types";
import { ActionButton } from "./ActionButton";

type ScreenHeaderProps = {
  navigation: AppNavigation;
  title: string;
};

export function ScreenHeader({ navigation, title }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <ActionButton
        accessibilityLabel="Open navigation menu"
        label="☰"
        onPress={() => navigation.openDrawer()}
        style={styles.menuButton}
        textStyle={styles.menuIcon}
      />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    paddingBottom: 8,
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  menuButton: { marginRight: 8, padding: 8 },
  menuIcon: { color: COLORS.white, fontSize: 28 },
  title: { color: COLORS.white, flex: 1, fontSize: 18, fontWeight: "700" },
});
