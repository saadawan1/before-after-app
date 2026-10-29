import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import type { AcquiredImage, LocationSnapshot } from "../types";

type AcquisitionErrorOptions = {
  openSettings?: boolean;
};

export class AcquisitionError extends Error {
  title: string;
  openSettings: boolean;

  constructor(
    title: string,
    message: string,
    { openSettings = false }: AcquisitionErrorOptions = {},
  ) {
    super(message);
    this.name = "AcquisitionError";
    this.title = title;
    this.openSettings = openSettings;
  }
}

const distanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const earthRadius = 6371000;
  const latitudeDelta = ((lat2 - lat1) * Math.PI) / 180;
  const longitudeDelta = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2;
  const normalizedA = Math.min(1, Math.max(0, a));
  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(normalizedA), Math.sqrt(1 - normalizedA))
  );
};

const readLocation = async (): Promise<LocationSnapshot> => {
  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    if (current.mocked) {
      throw new AcquisitionError(
        "Fake GPS Detected",
        "A mock location app is active. Disable fake GPS and try again.",
        { openSettings: true },
      );
    }

    const latitude = Number(current.coords.latitude.toFixed(5));
    const longitude = Number(current.coords.longitude.toFixed(5));
    return {
      coords: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      latitude,
      longitude,
      accuracy: current.coords.accuracy,
      timestamp: current.timestamp,
    };
  } catch (error: unknown) {
    if (error instanceof AcquisitionError) throw error;
    throw new AcquisitionError(
      "Location Error",
      "Could not retrieve GPS coordinates. Check your GPS signal and retry.",
    );
  }
};

const validateLocation = (
  location: LocationSnapshot,
  previousLocation: LocationSnapshot | null,
) => {
  const accuracy = location.accuracy;
  if (typeof accuracy !== "number" || !Number.isFinite(accuracy)) {
    throw new AcquisitionError(
      "Location Error",
      "GPS accuracy is unavailable. Move to an open area and try again.",
    );
  }

  if (accuracy > 50) {
    throw new AcquisitionError(
      "Poor GPS Signal",
      `GPS accuracy is ${accuracy.toFixed(0)}m. Move to an open area and retry when accuracy is below 50m.`,
    );
  }

  if (!previousLocation?.timestamp) return;
  const elapsedSeconds = (location.timestamp - previousLocation.timestamp) / 1000;
  if (elapsedSeconds <= 5) return;

  const distance = distanceInMeters(
    previousLocation.latitude,
    previousLocation.longitude,
    location.latitude,
    location.longitude,
  );
  if (distance / elapsedSeconds > 50) {
    throw new AcquisitionError(
      "Suspicious Location Jump",
      `Location jumped ${distance.toFixed(0)}m in ${elapsedSeconds.toFixed(0)}s. Verify GPS accuracy and retry.`,
    );
  }
};

export const captureCameraImage = async (
  previousLocation: LocationSnapshot | null,
): Promise<AcquiredImage | null> => {
  const locationPermission =
    await Location.requestForegroundPermissionsAsync();
  if (locationPermission.status !== "granted") {
    throw new AcquisitionError(
      "GPS Required",
      "Location permission is required to add GPS coordinates to camera records.",
      { openSettings: true },
    );
  }

  const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
  if (cameraPermission.status !== "granted") {
    throw new AcquisitionError(
      "Camera Required",
      "Camera permission is required to capture photos.",
      { openSettings: true },
    );
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new AcquisitionError(
      "Capture failed",
      "The camera did not return a usable image. Please retry.",
    );
  }

  const timestamp = new Date().toISOString();
  const location = await readLocation();
  validateLocation(location, previousLocation);

  return {
    sourceUri: asset.uri,
    metadata: { timestamp, gps: location.coords },
    gps: location.coords,
    location,
  };
};

export const pickGalleryImage = async (): Promise<AcquiredImage | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== "granted") {
    throw new AcquisitionError(
      "Gallery Required",
      "Photo library permission is required to select images.",
      { openSettings: true },
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    selectionLimit: 1,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new AcquisitionError(
      "Import failed",
      "The photo library did not return a usable image. Please retry.",
    );
  }

  return {
    sourceUri: asset.uri,
    metadata: null,
    gps: null,
  };
};
