import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function LoadingOverlay({ label = "Processing…" }: { label?: string }) {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator color="#fff" size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    zIndex: 99,
  },
  label: { color: "#fff", marginTop: 8 },
});
