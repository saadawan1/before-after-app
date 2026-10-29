import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import { CameraScreen } from "../screens/CameraScreen";
import { CreditsScreen } from "../screens/CreditsScreen";
import { GalleryScreen } from "../screens/GalleryScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { COLORS } from "../constants";
import type { RootDrawerParamList } from "../types";

const Drawer = createDrawerNavigator<RootDrawerParamList>();

export function DrawerNavigator() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          drawerStyle: { backgroundColor: "#e8f5e9", paddingTop: 30, width: 280 },
          drawerActiveTintColor: COLORS.primary,
          drawerInactiveTintColor: COLORS.muted,
          drawerLabelStyle: { fontSize: 16, fontWeight: "600" },
          drawerItemStyle: {
            borderBottomColor: "#c5e1c5",
            borderBottomWidth: 1,
            marginVertical: 0,
            paddingVertical: 1,
          },
        }}
      >
        <Drawer.Screen
          name="Home"
          component={CameraScreen}
          options={{ drawerLabel: "📷 Capture through Camera", title: "Capture Images" }}
        />
        <Drawer.Screen
          name="GalleryWork"
          component={GalleryScreen}
          options={{ drawerLabel: "🖼️ Pick From Gallery", title: "Pick Images" }}
        />
        <Drawer.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ drawerLabel: "⚙️ Settings", title: "Settings" }}
        />
        <Drawer.Screen
          name="Credits"
          component={CreditsScreen}
          options={{ drawerLabel: "📝 Credits", title: "Credits" }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
