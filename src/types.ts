import type { DrawerNavigationProp } from "@react-navigation/drawer";

export type RootDrawerParamList = {
  Home: undefined;
  GalleryWork: undefined;
  Settings: undefined;
  Credits: undefined;
};

export type AppNavigation = DrawerNavigationProp<RootDrawerParamList>;

export type AppInfo = {
  tag: string;
};

export type ImageMetadata = {
  timestamp: string;
  gps: string;
};

export type LocationSnapshot = {
  coords: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export type AcquiredImage = {
  sourceUri: string;
  metadata: ImageMetadata | null;
  gps: string | null;
  location?: LocationSnapshot;
};

export type AcquireImage = (request: {
  kind: "before" | "after";
  cardId: string;
}) => Promise<AcquiredImage | null>;

export type WorkCard = {
  id: string;
  beforeUri: string;
  beforeMetadata: ImageMetadata | null;
  afterUri: string | null;
  afterMetadata: ImageMetadata | null;
  createdAt: string;
  gps: string | null;
  tag: string;
};

export type CardImageReference = {
  beforeUri?: string | null;
  afterUri?: string | null;
};

export type WorkMode = "camera" | "gallery";

export type WorkModeConfig = {
  title: string;
  emptyText: string;
  primaryAction: string;
  afterAction: string;
};

export type AppPreferences = {
  info: AppInfo | null;
  saveInfo: (info: AppInfo) => Promise<void>;
  showTag: boolean;
  saveShowTag: (value: boolean) => Promise<void>;
  sameTagForAll: boolean;
  saveSameTagForAll: (value: boolean) => Promise<void>;
};
