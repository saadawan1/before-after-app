import { forwardRef } from "react";
import { Image } from "expo-image";
import type { LayoutChangeEvent } from "react-native";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { AppInfo, ImageMetadata, WorkCard } from "../types";
import { formatDate } from "../utils/date";

const metadataText = (
  metadata?: ImageMetadata | null,
  fallbackTimestamp?: string,
  fallbackGps?: string | null,
) => {
  if (metadata?.timestamp) {
    return `${formatDate(metadata.timestamp)}   ${metadata.gps || "GPS unavailable"}`;
  }
  if (!fallbackTimestamp) return "";
  return `${formatDate(fallbackTimestamp)}   ${fallbackGps || "GPS unavailable"}`;
};

type CompositeCardProps = {
  card: WorkCard;
  info: AppInfo | null;
  showTag?: boolean;
  sameTagForAll?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export const CompositeCard = forwardRef<View, CompositeCardProps>(function CompositeCard(
  { card, info, showTag = true, sameTagForAll = true, onLayout },
  ref,
) {
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 375, 0.85), 1.35);
  const location = sameTagForAll ? info?.tag || "" : card.tag || "";

  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={onLayout}
      style={styles.wrapper}
    >
      <View style={[styles.imageRow, { height: Math.round(200 * scale) }]}>
        <CardHalf
          label="BEFORE"
          uri={card.beforeUri}
          metadata={metadataText(
            card.beforeMetadata,
            card.createdAt,
            card.gps,
          )}
          placeholder="No Image"
          scale={scale}
        />
        <CardHalf
          label="AFTER"
          uri={card.afterUri}
          metadata={metadataText(card.afterMetadata)}
          placeholder={"Pending\n\nUse the button below to add an after photo"}
          scale={scale}
        />
      </View>
      {showTag && location.length > 0 ? (
        <View style={styles.tagStrip}>
          <Text style={styles.tagText}>{location}</Text>
        </View>
      ) : null}
    </View>
  );
});

type CardHalfProps = {
  label: string;
  uri: string | null;
  metadata: string;
  placeholder: string;
  scale: number;
};

function CardHalf({ label, uri, metadata, placeholder, scale }: CardHalfProps) {
  return (
    <View style={styles.half}>
      {uri ? (
        <View style={styles.fill}>
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            recyclingKey={uri}
            source={{ uri }}
            style={styles.image}
          />
          {metadata ? (
            <View style={styles.metadataOverlay}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={[styles.metadataText, { fontSize: Math.round(9 * scale) }]}
              >
                {metadata}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{placeholder}</Text>
        </View>
      )}
      <View style={styles.labelWrapper}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: "#fff", borderRadius: 10, overflow: "hidden" },
  imageRow: { flexDirection: "row", gap: 2 },
  half: { flex: 1, position: "relative" },
  fill: { flex: 1 },
  image: { height: "100%", width: "100%" },
  placeholder: {
    alignItems: "center",
    backgroundColor: "#383737",
    flex: 1,
    justifyContent: "center",
  },
  placeholderText: {
    color: "#d5cbcb",
    fontSize: 13,
    paddingHorizontal: 6,
    textAlign: "center",
  },
  labelWrapper: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.38)",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  label: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  metadataOverlay: {
    backgroundColor: "rgba(0,0,0,0.6)",
    bottom: 0,
    left: 0,
    paddingHorizontal: 2,
    position: "absolute",
    right: 0,
  },
  metadataText: { color: "#fff", fontWeight: "600" },
  tagStrip: { backgroundColor: "#fff", paddingHorizontal: 4, paddingVertical: 1 },
  tagText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
});
