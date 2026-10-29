import { useCallback } from "react";
import type { DrawerScreenProps } from "@react-navigation/drawer";
import { STORAGE_KEYS } from "../constants";
import { useAppPreferences } from "../context/AppPreferencesContext";
import { pickGalleryImage } from "../services/acquisition";
import type { RootDrawerParamList } from "../types";
import { WorkCardsScreen } from "./WorkCardsScreen";

type GalleryScreenProps = DrawerScreenProps<RootDrawerParamList, "GalleryWork">;

export function GalleryScreen({ navigation }: GalleryScreenProps) {
  const acquireImage = useCallback(() => pickGalleryImage(), []);
  const { info, showTag, sameTagForAll } = useAppPreferences();

  return (
    <WorkCardsScreen
      navigation={navigation}
      info={info}
      showTag={showTag}
      sameTagForAll={sameTagForAll}
      mode="gallery"
      storageKey={STORAGE_KEYS.galleryCards}
      acquireImage={acquireImage}
    />
  );
}
