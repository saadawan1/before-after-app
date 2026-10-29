import type { WorkMode, WorkModeConfig } from "./types";

export const STORAGE_KEYS = {
  council: "@council_info",
  cameraCards: "@work_cards",
  galleryCards: "@gallery_work_cards",
  showTag: "@show_council_details",
  sameTag: "@same_tag_for_all",
} as const;

export const COLORS = {
  primary: "#1a6b3c",
  secondary: "#0e5692",
  background: "#f4f1f0",
  danger: "#bf1a1a",
  text: "#222",
  muted: "#666",
  white: "#fff",
} as const;

export const WORK_MODES = {
  camera: {
    title: "📸 Capture through camera",
    emptyText: "No work records yet.\nPress 📸 BEFORE to start.",
    primaryAction: "📸 BEFORE",
    afterAction: "📷 Take AFTER Photo",
  },
  gallery: {
    title: "🖼 Pick From Gallery",
    emptyText: "No gallery records yet.\nPress 🖼 GALLERY to start.",
    primaryAction: "🖼 GALLERY",
    afterAction: "📷 Pick AFTER Photo",
  },
} satisfies Record<WorkMode, WorkModeConfig>;
