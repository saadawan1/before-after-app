import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text } from "react-native";

type ActionButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function ActionButton({
  label,
  onPress,
  style,
  textStyle,
  disabled = false,
  accessibilityLabel,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, style, disabled && styles.disabled]}
    >
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  label: { textAlign: "center" },
});
