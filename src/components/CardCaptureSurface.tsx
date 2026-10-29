import { Image } from "expo-image";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { prepareCapturedUri } from "../services/image-files";
import type { AppInfo, WorkCard } from "../types";
import { CompositeCard } from "./CompositeCard";

type CardCaptureSurfaceProps = {
  info: AppInfo | null;
  showTag: boolean;
  sameTagForAll: boolean;
};

export type CardCaptureSurfaceHandle = {
  captureCards: (cards: WorkCard[]) => Promise<string[]>;
};

export const CardCaptureSurface = forwardRef<
  CardCaptureSurfaceHandle,
  CardCaptureSurfaceProps
>(function CardCaptureSurface(
  { info, showTag, sameTagForAll },
  ref,
) {
  const [card, setCard] = useState<WorkCard | null>(null);
  const viewRef = useRef<View | null>(null);
  const readyRef = useRef<(() => void) | null>(null);

  const handleLayout = useCallback(() => {
    const resolve = readyRef.current;
    if (!resolve) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (readyRef.current !== resolve) return;
        readyRef.current = null;
        resolve();
      });
    });
  }, []);

  const mountCard = useCallback(async (nextCard: WorkCard) => {
    const imageUris = [nextCard.beforeUri, nextCard.afterUri].filter(
      (uri): uri is string => Boolean(uri),
    );
    if (imageUris.length > 0) {
      await Image.prefetch(imageUris, "memory-disk");
    }

    const ready = new Promise<void>((resolve) => {
      readyRef.current = resolve;
    });
    setCard(nextCard);
    await ready;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      captureCards: async (cards) => {
        const uris: string[] = [];
        try {
          for (const nextCard of cards) {
            await mountCard(nextCard);
            const uri = await captureRef(viewRef, {
              format: "jpg",
              quality: 0.95,
            });
            uris.push(prepareCapturedUri(uri));
            setCard(null);
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          }
          return uris;
        } finally {
          readyRef.current = null;
          setCard(null);
        }
      },
    }),
    [mountCard],
  );

  if (!card) return null;

  return (
    <View
      ref={viewRef}
      collapsable={false}
      pointerEvents="none"
      style={styles.surface}
    >
      <CompositeCard
        key={card.id}
        card={card}
        info={info}
        onLayout={handleLayout}
        sameTagForAll={sameTagForAll}
        showTag={showTag}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  surface: {
    left: 12,
    position: "absolute",
    right: 12,
    top: 80,
    zIndex: 90,
  },
});
