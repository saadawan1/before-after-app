import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS } from "./constants";
import { AppPreferencesContext } from "./context/AppPreferencesContext";
import { useAppPreferences } from "./hooks/use-app-preferences";
import { DrawerNavigator } from "./navigation/DrawerNavigator";
import { SetupScreen } from "./screens/SetupScreen";

export default function App() {
  const { isReady, value } = useAppPreferences();

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppPreferencesContext.Provider value={value}>
        {value.info ? (
          <DrawerNavigator />
        ) : (
          <SetupScreen onSave={value.saveInfo} />
        )}
      </AppPreferencesContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    flex: 1,
    justifyContent: "center",
  },
});
