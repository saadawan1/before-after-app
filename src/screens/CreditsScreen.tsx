import type { DrawerScreenProps } from "@react-navigation/drawer";
import type { ReactNode } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormCard } from "../components/FormCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { COLORS } from "../constants";
import type { RootDrawerParamList } from "../types";

const features = [
  "Before/after photo documentation",
  "GPS coordinates on camera records",
  "Timestamp metadata",
  "Share work cards as images",
  "Offline-first data storage",
];

type CreditsScreenProps = DrawerScreenProps<RootDrawerParamList, "Credits">;

export function CreditsScreen({ navigation }: CreditsScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScreenHeader navigation={navigation} title="📝 Credits" />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <FormCard title="📝 Credits">
          <Text style={styles.heading}>
            Before and After Image Comparison App{"\n"}Field Monitoring App
          </Text>
          <Text style={styles.text}>Version 1.0.0</Text>

          <Section title="Purpose">
            This application helps users capture before and after images of
            activities or products, then place them side by side to document the
            difference.
          </Section>

          <Text style={styles.sectionHeading}>Features</Text>
          {features.map((feature) => (
            <Text key={feature} style={styles.text}>
              {feature}
            </Text>
          ))}

          <Section title="Built With">React Native & Expo</Section>
          <Section title="Developed By">Saad Shaukat</Section>

          <Text style={styles.footer}>
            © 2026 Saad Shaukat. All rights reserved. For support or inquiries,
            contact ssawan121@gmail.com.
          </Text>
        </FormCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text style={styles.sectionHeading}>{title}</Text>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  content: { flexGrow: 1, padding: 20 },
  heading: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
  sectionHeading: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
  },
  text: { color: "#333", fontSize: 14, lineHeight: 20, marginTop: 8 },
  footer: {
    color: "#333",
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 20,
    marginTop: 30,
    textAlign: "center",
  },
});
