import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants";
import type { AppInfo, WorkCard } from "../types";
import { ActionButton } from "./ActionButton";
import { CompositeCard } from "./CompositeCard";
import { PerCardTagInput } from "./PerCardTagInput";

type WorkCardItemProps = {
  card: WorkCard;
  info: AppInfo | null;
  isSelected: boolean;
  selectMode: boolean;
  showTag: boolean;
  sameTagForAll: boolean;
  afterActionLabel: string;
  onPress: (cardId: string) => void;
  onLongPress: (cardId: string) => void;
  onAfterPress: (cardId: string) => void | Promise<void>;
  onTagSave: (cardId: string, tag: string) => Promise<unknown>;
};

export const WorkCardItem = memo(function WorkCardItem({
  card,
  info,
  isSelected,
  selectMode,
  showTag,
  sameTagForAll,
  afterActionLabel,
  onPress,
  onLongPress,
  onAfterPress,
  onTagSave,
}: WorkCardItemProps) {
  const handlePress = () => onPress(card.id);
  const handleLongPress = () => onLongPress(card.id);
  const handleAfterPress = () => onAfterPress(card.id);
  const handleTagSave = (tag: string) => onTagSave(card.id, tag);

  return (
    <View style={[styles.wrapper, isSelected ? styles.selected : null]}>
      <Pressable
        accessibilityRole="button"
        onLongPress={handleLongPress}
        onPress={handlePress}
      >
        {selectMode ? (
          <View style={styles.checkbox}>
            <Text
              style={[
                styles.checkboxText,
                isSelected ? styles.checked : null,
              ]}
            >
              {isSelected ? "✔" : "☐"}
            </Text>
          </View>
        ) : null}

        <CompositeCard
          card={card}
          info={info}
          showTag={showTag}
          sameTagForAll={sameTagForAll}
        />
      </Pressable>

      {!sameTagForAll && !selectMode && showTag ? (
        <PerCardTagInput
          initialTag={card.tag || ""}
          onSave={handleTagSave}
        />
      ) : null}

      {!card.afterUri && !selectMode ? (
        <ActionButton
          label={afterActionLabel}
          onPress={handleAfterPress}
          style={styles.afterButton}
          textStyle={styles.afterButtonText}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#187c08",
    borderColor: "transparent",
    borderRadius: 10,
    borderWidth: 2,
    elevation: 3,
    marginBottom: 10,
    overflow: "hidden",
  },
  selected: { borderColor: COLORS.primary },
  checkbox: {
    backgroundColor: COLORS.white,
    borderRadius: 4,
    elevation: 4,
    padding: 2,
    position: "absolute",
    right: 6,
    top: 6,
    zIndex: 10,
  },
  checkboxText: { color: "#ccc", fontSize: 22 },
  checked: { color: COLORS.primary },
  afterButton: { alignItems: "center", backgroundColor: COLORS.primary, padding: 10 },
  afterButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "600" },
});
