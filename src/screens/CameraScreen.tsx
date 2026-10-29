import { useCallback, useRef } from "react";
import type { DrawerScreenProps } from "@react-navigation/drawer";
import { STORAGE_KEYS } from "../constants";
import { useAppPreferences } from "../context/AppPreferencesContext";
import { captureCameraImage } from "../services/acquisition";
import type { AcquiredImage, LocationSnapshot, RootDrawerParamList } from "../types";
import { WorkCardsScreen } from "./WorkCardsScreen";

type CameraScreenProps = DrawerScreenProps<RootDrawerParamList, "Home">;

export function CameraScreen({ navigation }: CameraScreenProps) {
  const lastLocation = useRef<LocationSnapshot | null>(null);
  const { info, showTag, sameTagForAll } = useAppPreferences();

  const acquireImage = useCallback(
    () => captureCameraImage(lastLocation.current),
    [],
  );

  const handleImageAcquired = useCallback((result: AcquiredImage) => {
    if (result.location) lastLocation.current = result.location;
  }, []);

  return (
    <WorkCardsScreen
      navigation={navigation}
      info={info}
      showTag={showTag}
      sameTagForAll={sameTagForAll}
      mode="camera"
      storageKey={STORAGE_KEYS.cameraCards}
      acquireImage={acquireImage}
      onImageAcquired={handleImageAcquired}
    />
  );
}
