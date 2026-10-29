import { useCallback, useEffect, useRef, useState } from "react";
import {
  hydrateCards,
  releaseCardImages,
  serializeCards,
} from "../services/image-files";
import { readJSON, writeJSON } from "../services/storage";
import type { WorkCard } from "../types";

type CardsUpdater = WorkCard[] | ((cards: WorkCard[]) => WorkCard[]);

export const useStoredCards = (storageKey: string) => {
  const [cards, setCards] = useState<WorkCard[]>([]);
  const [isReady, setIsReady] = useState(false);
  const cardsRef = useRef<WorkCard[]>([]);
  const mutationQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const isMountedRef = useRef(true);

  useEffect(() => {
    let active = true;
    isMountedRef.current = true;
    setIsReady(false);

    const loadCards = async () => {
      const storedCards = await readJSON<unknown>(storageKey, []);
      const normalizedCards = Array.isArray(storedCards)
        ? (storedCards as WorkCard[])
        : [];
      const hydratedCards = await hydrateCards(normalizedCards);
      if (!active) {
        releaseCardImages(hydratedCards);
        return;
      }
      cardsRef.current = hydratedCards;
      setCards(hydratedCards);
      setIsReady(true);
    };

    loadCards().catch((error) => {
      if (!active) return;
      console.error("Could not load saved cards:", error);
      cardsRef.current = [];
      setCards([]);
      setIsReady(true);
    });

    return () => {
      active = false;
      isMountedRef.current = false;
      releaseCardImages(cardsRef.current);
    };
  }, [storageKey]);

  const updateCards = useCallback(
    (updater: CardsUpdater) => {
      const operation = mutationQueueRef.current.then(async () => {
        const currentCards = cardsRef.current;
        const updatedCards =
          typeof updater === "function" ? updater(currentCards) : updater;

        if (!Array.isArray(updatedCards)) {
          throw new TypeError("Card updates must return an array.");
        }

        await writeJSON(storageKey, await serializeCards(updatedCards));
        cardsRef.current = updatedCards;
        if (isMountedRef.current) setCards(updatedCards);
        return updatedCards;
      });

      mutationQueueRef.current = operation.catch(() => undefined);
      return operation;
    },
    [storageKey],
  );

  return { cards, isReady, updateCards };
};
