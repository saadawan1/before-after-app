# BeforeAfter

An Expo/React Native app for creating side-by-side before-and-after photo records. Camera records include a capture time and GPS coordinates; gallery images can also be paired, tagged, saved, and shared.

## Requirements

- Node.js 20 or newer
- npm
- An iOS/Android development build for native sharing

## Setup

```bash
npm install
npm start
```

Other development commands:

```bash
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
```

Camera capture requires foreground location access. On native platforms, photos
are copied into app-owned document storage; the web build stores imported
images in IndexedDB. Deleting a record also removes its stored image data.
**Save & Delete** writes composed cards to the device photo library on native
or downloads them in the browser before removing the records.

## Project structure

```text
src/
  components/   Reusable UI and work-card presentation
  context/      App-wide preference context
  hooks/        Preference and persisted-card state
  navigation/   Drawer navigation configuration
  screens/      Setup, settings, credits, and work workflows
  services/     Image acquisition, files, storage, and sharing
  types.ts      Shared domain and navigation types
  utils/        Date and ID helpers
```

`WorkCardsScreen` contains the shared card workflow. `CameraScreen` and
`GalleryScreen` only provide their acquisition strategy, keeping selection,
tagging, sharing, deletion, and persistence behavior consistent.

## Verification

```bash
npm run lint
npm run typecheck
npx expo-doctor
npx expo export --platform all
```
