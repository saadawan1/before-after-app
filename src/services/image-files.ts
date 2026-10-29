import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import type { CardImageReference, WorkCard } from "../types";

const imageDirectory = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}work-images/`
  : null;

export const persistImage = async (
  sourceUri: string,
  cardId: string,
  kind: "before" | "after",
) => {
  if (!imageDirectory || !sourceUri) {
    throw new Error("Persistent file storage is not available.");
  }

  await FileSystem.makeDirectoryAsync(imageDirectory, {
    intermediates: true,
  });

  const extensionMatch = sourceUri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const allowedExtensions = ["jpg", "jpeg", "png", "heic", "webp"];
  const candidate = extensionMatch?.[1]?.toLowerCase();
  const extension = candidate && allowedExtensions.includes(candidate) ? candidate : "jpg";
  const destination = `${imageDirectory}${cardId}-${kind}-${Date.now()}.${extension}`;

  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
};

export const deleteCardImages = async (cards: CardImageReference[]) => {
  const uris = cards
    .flatMap((card) => [card.beforeUri, card.afterUri])
    .filter(
      (uri): uri is string =>
        Boolean(imageDirectory) && typeof uri === "string" && uri.startsWith(imageDirectory!),
    );

  await Promise.all(
    uris.map((uri) =>
      FileSystem.deleteAsync(uri, { idempotent: true }).catch((error) => {
        console.warn("Could not remove image file:", error);
      }),
    ),
  );
};

export const prepareCapturedUri = (uri: string) => {
  if (Platform.OS === "web" || uri?.startsWith("file://")) return uri;
  return `file://${uri}`;
};

export const hydrateCards = async (cards: WorkCard[]) => cards;

export const serializeCards = async (cards: WorkCard[]) => cards;

export const releaseCardImages = (_cards: WorkCard[]) => {};
