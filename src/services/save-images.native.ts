import * as MediaLibrary from "expo-media-library";

export const saveImages = async (uris: string[]) => {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (permission.status !== "granted") {
    throw new Error("Photo library permission is required to save cards.");
  }

  for (const uri of uris) {
    await MediaLibrary.saveToLibraryAsync(uri);
  }
  return uris.length;
};
