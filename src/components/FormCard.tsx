import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants";

type FormCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function FormCard({ title, subtitle, children }: FormCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

export const formStyles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { color: "#333", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  input: {
    borderColor: "#ddd",
    borderRadius: 8,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 15,
    padding: 10,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    marginTop: 10,
    padding: 14,
  },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});

const styles = StyleSheet.create({
  card: {
    alignSelf: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    elevation: 6,
    maxWidth: 500,
    padding: 24,
    width: "100%",
  },
  title: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 20,
    textAlign: "center",
  },
});
