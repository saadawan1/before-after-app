import { Image } from "expo-image";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionButton } from "./ActionButton";
import type { AppInfo, ImageMetadata, WorkCard } from "../types";
import { formatDate } from "../utils/date";

type FullScreenCardModalProps = {
  card: WorkCard | null;
  info: AppInfo | null;
  showTag: boolean;
  sameTagForAll: boolean;
  onClose: () => void;
};

export function FullScreenCardModal({
  card,
  info,
  showTag,
  sameTagForAll,
  onClose,
}: FullScreenCardModalProps) {
  const { height } = useWindowDimensions();
  if (!card) return null;

  const location = sameTagForAll ? info?.tag || "" : card.tag || "";

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <ActionButton
          accessibilityLabel="Close full screen card"
          label="✕"
          onPress={onClose}
          style={styles.closeButton}
          textStyle={styles.closeText}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.row}>
            <FullScreenHalf
              label="BEFORE"
              uri={card.beforeUri}
              metadata={card.beforeMetadata}
              fallbackGps={card.gps}
              fallbackTimestamp={card.createdAt}
              height={height * 0.5}
              placeholder="No Image"
            />
            <FullScreenHalf
              label="AFTER"
              uri={card.afterUri}
              metadata={card.afterMetadata}
              height={height * 0.5}
              placeholder="Pending"
            />
          </View>

          {showTag && location.length > 0 ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{location}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

type FullScreenHalfProps = {
  label: string;
  uri: string | null;
  metadata: ImageMetadata | null;
  fallbackGps?: string | null;
  fallbackTimestamp?: string;
  height: number;
  placeholder: string;
};

function FullScreenHalf({
  label,
  uri,
  metadata,
  fallbackGps,
  fallbackTimestamp,
  height,
  placeholder,
}: FullScreenHalfProps) {
  let formattedMetadata = "";
  if (metadata?.timestamp) {
    formattedMetadata = `${formatDate(metadata.timestamp)}   ${metadata.gps || "GPS unavailable"}`;
  } else if (fallbackTimestamp) {
    formattedMetadata = `${formatDate(fallbackTimestamp)}   ${fallbackGps || "GPS unavailable"}`;
  }

  return (
    <View style={styles.half}>
      <Text style={styles.label}>{label}</Text>
      {uri ? (
        <>
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            priority="high"
            source={{ uri }}
            style={[styles.image, { height }]}
          />
          {formattedMetadata ? (
            <View style={styles.metadata}>
              <Text style={styles.metadataText}>{formattedMetadata}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <View style={[styles.placeholder, { height }]}>
          <Text style={styles.placeholderText}>{placeholder}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#000", flex: 1 },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    top: 50,
    width: 44,
    zIndex: 10,
  },
  closeText: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  row: { flexDirection: "row", gap: 8, marginBottom: 20 },
  half: { flex: 1 },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: "center",
  },
  image: { borderRadius: 8, width: "100%" },
  placeholder: {
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 8,
    justifyContent: "center",
    width: "100%",
  },
  placeholderText: { color: "#666", fontSize: 14 },
  metadata: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    marginTop: 8,
    padding: 8,
  },
  metadataText: { color: "#ccc", fontSize: 13 },
  tag: {
    backgroundColor: "rgba(255,111,0,0.2)",
    borderLeftColor: "#ff6f00",
    borderLeftWidth: 4,
    borderRadius: 8,
    marginTop: 20,
    padding: 12,
  },
  tagText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
