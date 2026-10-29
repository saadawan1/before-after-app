import { Text, TextInput, View } from "react-native";
import { formStyles } from "./FormCard";

type TagFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function TagField({ value, onChangeText }: TagFieldProps) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>Image Tag</Text>
      <TextInput
        style={formStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Enter your image tag"
        placeholderTextColor="#999"
        autoCorrect={false}
        autoCapitalize="words"
      />
    </View>
  );
}
