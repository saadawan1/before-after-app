import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ListRenderItemInfo } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ActionButton } from "../components/ActionButton";
import {
  CardCaptureSurface,
  type CardCaptureSurfaceHandle,
} from "../components/CardCaptureSurface";
import { FullScreenCardModal } from "../components/FullScreenCardModal";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ScreenHeader } from "../components/ScreenHeader";
import { SelectionToolbar } from "../components/SelectionToolbar";
import { WorkCardItem } from "../components/WorkCardItem";
import { COLORS, WORK_MODES } from "../constants";
import { useStoredCards } from "../hooks/use-stored-cards";
import { AcquisitionError } from "../services/acquisition";
import {
  deleteCardImages,
  persistImage,
} from "../services/image-files";
import { shareImages } from "../services/share-images";
import { isShareCancellation } from "../services/share-errors";
import { saveImages } from "../services/save-images";
import type {
  AcquireImage,
  AcquiredImage,
  AppInfo,
  AppNavigation,
  WorkCard,
  WorkMode,
} from "../types";
import { createCardId } from "../utils/ids";

type WorkCardsScreenProps = {
  navigation: AppNavigation;
  info: AppInfo | null;
  showTag: boolean;
  sameTagForAll: boolean;
  storageKey: string;
  mode: WorkMode;
  acquireImage: AcquireImage;
  onImageAcquired?: (image: AcquiredImage) => void;
};

export function WorkCardsScreen({
  navigation,
  info,
  showTag,
  sameTagForAll,
  storageKey,
  mode,
  acquireImage,
  onImageAcquired,
}: WorkCardsScreenProps) {
  const config = WORK_MODES[mode];
  const { cards, isReady, updateCards } = useStoredCards(storageKey);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set<string>());
  const [isProcessing, setIsProcessing] = useState(false);
  const [fullScreenCardId, setFullScreenCardId] = useState<string | null>(null);
  const captureSurfaceRef = useRef<CardCaptureSurfaceHandle | null>(null);
  const insets = useSafeAreaInsets();

  const fullScreenCard = useMemo(
    () => cards.find((card) => card.id === fullScreenCardId) || null,
    [cards, fullScreenCardId],
  );

  const showAcquisitionError = useCallback((error: unknown, fallbackTitle: string) => {
    const isAcquisitionError = error instanceof AcquisitionError;
    const title = isAcquisitionError ? error.title : fallbackTitle;
    const message = error instanceof Error ? error.message : "Please try again.";
    if (isAcquisitionError && error.openSettings) {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const notifyImageAcquired = useCallback(
    (acquired: AcquiredImage) => {
      try {
        onImageAcquired?.(acquired);
      } catch (error) {
        console.warn("Could not process acquired image metadata:", error);
      }
    },
    [onImageAcquired],
  );

  const addBeforeImage = useCallback(async () => {
    setIsProcessing(true);
    let storedUri: string | null = null;
    try {
      const id = createCardId();
      const acquired = await acquireImage({ kind: "before", cardId: id });
      if (!acquired) return;

      const persistedUri = await persistImage(acquired.sourceUri, id, "before");
      storedUri = persistedUri;
      const createdAt = acquired.metadata?.timestamp || new Date().toISOString();
      await updateCards((currentCards) => [
        ...currentCards,
        {
          id,
          beforeUri: persistedUri,
          beforeMetadata: acquired.metadata,
          afterUri: null,
          afterMetadata: null,
          createdAt,
          gps: acquired.gps,
          tag: "",
        },
      ]);
      storedUri = null;
      notifyImageAcquired(acquired);
    } catch (error: unknown) {
      if (storedUri) await deleteCardImages([{ beforeUri: storedUri }]);
      showAcquisitionError(error, mode === "camera" ? "Capture failed" : "Import failed");
      console.error("Could not add before image:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    acquireImage,
    mode,
    notifyImageAcquired,
    showAcquisitionError,
    updateCards,
  ]);

  const addAfterImage = useCallback(
    async (cardId: string) => {
      setIsProcessing(true);
      let storedUri: string | null = null;
      try {
        const acquired = await acquireImage({ kind: "after", cardId });
        if (!acquired) return;

        const persistedUri = await persistImage(acquired.sourceUri, cardId, "after");
        storedUri = persistedUri;
        await updateCards((currentCards) =>
          currentCards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  afterUri: persistedUri,
                  afterMetadata: acquired.metadata,
                }
              : card,
          ),
        );
        storedUri = null;
        notifyImageAcquired(acquired);
      } catch (error: unknown) {
        if (storedUri) await deleteCardImages([{ afterUri: storedUri }]);
        showAcquisitionError(error, mode === "camera" ? "Capture failed" : "Import failed");
        console.error("Could not add after image:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      acquireImage,
      mode,
      notifyImageAcquired,
      showAcquisitionError,
      updateCards,
    ],
  );

  const toggleSelected = useCallback((id: string) => {
    setSelected((current) => {
      const updated = new Set(current);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectMode(false);
  }, []);

  const captureSelectedCards = useCallback(async () => {
    const cardsToCapture = cards.filter((card) => selected.has(card.id));
    if (cardsToCapture.length !== selected.size) {
      throw new Error("Some selected cards are no longer available.");
    }

    if (!captureSurfaceRef.current) {
      throw new Error("The card renderer is not ready. Please retry.");
    }

    return captureSurfaceRef.current.captureCards(cardsToCapture);
  }, [cards, selected]);

  const shareSelected = useCallback(async () => {
    if (selected.size === 0) {
      Alert.alert("None selected", "Select at least one card to share.");
      return;
    }

    setIsProcessing(true);
    try {
      await shareImages(await captureSelectedCards());
      clearSelection();
    } catch (error: unknown) {
      if (!isShareCancellation(error)) {
        const message = error instanceof Error ? error.message : "Could not share the cards.";
        Alert.alert("Share failed", message);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [captureSelectedCards, clearSelection, selected.size]);

  const removeSelected = useCallback(
    async ({ saveFirst }: { saveFirst: boolean }) => {
      setIsProcessing(true);
      try {
        let captured: string[] = [];
        if (saveFirst) {
          captured = await captureSelectedCards();
          await saveImages(captured);
        }

        let removed: WorkCard[] = [];
        await updateCards((currentCards) => {
          removed = currentCards.filter((card) => selected.has(card.id));
          return currentCards.filter((card) => !selected.has(card.id));
        });
        await deleteCardImages(removed);
        clearSelection();
        Alert.alert(
          "Success",
          saveFirst
            ? `${captured.length} image(s) saved and deleted from the app.`
            : "Cards deleted from the app.",
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "The operation failed.";
        Alert.alert(
          saveFirst ? "Could not save" : "Delete failed",
          `${message}${saveFirst ? " No cards were deleted." : ""}`,
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [captureSelectedCards, clearSelection, selected, updateCards],
  );

  const confirmDelete = useCallback(() => {
    if (selected.size === 0) {
      Alert.alert("None selected", "Select at least one card to delete.");
      return;
    }

    Alert.alert("Delete Cards", `Delete ${selected.size} card(s)?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete Without Saving",
        style: "destructive",
        onPress: () => removeSelected({ saveFirst: false }),
      },
      {
        text: "Save & Delete",
        onPress: () => removeSelected({ saveFirst: true }),
      },
    ]);
  }, [removeSelected, selected.size]);

  const saveCardTag = useCallback(
    (cardId: string, tag: string) =>
      updateCards((currentCards) =>
        currentCards.map((card) =>
          card.id === cardId ? { ...card, tag } : card,
        ),
      ),
    [updateCards],
  );

  const handleCardPress = useCallback(
    (cardId: string) => {
      if (selectMode) {
        toggleSelected(cardId);
        return;
      }

      const card = cards.find((candidate) => candidate.id === cardId);
      if (card?.beforeUri && card.afterUri) setFullScreenCardId(cardId);
    },
    [cards, selectMode, toggleSelected],
  );

  const handleCardLongPress = useCallback(
    (cardId: string) => {
      if (selectMode) return;
      setSelectMode(true);
      setSelected(new Set([cardId]));
    },
    [selectMode],
  );

  const handleSelectAll = useCallback(() => {
    setSelected(new Set(cards.map((card) => card.id)));
  }, [cards]);

  const handleShareAction = useCallback(() => {
    if (!selectMode) {
      setSelectMode(true);
      setSelected(new Set());
      return;
    }
    shareSelected();
  }, [selectMode, shareSelected]);

  const renderCard = useCallback(
    ({ item }: ListRenderItemInfo<WorkCard>) => (
      <WorkCardItem
        card={item}
        info={info}
        isSelected={selected.has(item.id)}
        selectMode={selectMode}
        showTag={showTag}
        sameTagForAll={sameTagForAll}
        afterActionLabel={config.afterAction}
        onPress={handleCardPress}
        onLongPress={handleCardLongPress}
        onAfterPress={addAfterImage}
        onTagSave={saveCardTag}
      />
    ),
    [
      addAfterImage,
      config.afterAction,
      info,
      sameTagForAll,
      handleCardLongPress,
      handleCardPress,
      selectMode,
      selected,
      showTag,
      saveCardTag,
    ],
  );

  const closeFullScreenCard = useCallback(() => {
    setFullScreenCardId(null);
  }, []);

  if (!isReady) {
    return (
      <View style={styles.initialLoading}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScreenHeader navigation={navigation} title={config.title} />

      {selectMode ? (
        <SelectionToolbar
          count={selected.size}
          onSelectAll={handleSelectAll}
          onDelete={confirmDelete}
          onCancel={clearSelection}
        />
      ) : null}

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{config.emptyText}</Text>
        </View>
      ) : (
        <FlatList<WorkCard>
          contentContainerStyle={styles.listContent}
          data={cards}
          initialNumToRender={6}
          keyExtractor={(card) => card.id}
          maxToRenderPerBatch={6}
          renderItem={renderCard}
          windowSize={7}
        />
      )}

      <CardCaptureSurface
        ref={captureSurfaceRef}
        info={info}
        sameTagForAll={sameTagForAll}
        showTag={showTag}
      />

      {isProcessing ? <LoadingOverlay /> : null}

      <FullScreenCardModal
        card={fullScreenCard}
        info={info}
        showTag={showTag}
        sameTagForAll={sameTagForAll}
        onClose={closeFullScreenCard}
      />

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <ActionButton
          disabled={isProcessing}
          label={config.primaryAction}
          onPress={addBeforeImage}
          style={styles.primaryAction}
          textStyle={styles.actionText}
        />
        <ActionButton
          disabled={isProcessing}
          label={selectMode ? "📤 SHARE NOW" : "SELECT"}
          onPress={handleShareAction}
          style={styles.shareAction}
          textStyle={styles.actionText}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  initialLoading: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
  },
  listContent: { padding: 12, paddingBottom: 80 },
  empty: { alignItems: "center", flex: 1, justifyContent: "center" },
  emptyText: { color: "#999", fontSize: 16, lineHeight: 26, textAlign: "center" },
  bottomBar: {
    backgroundColor: COLORS.white,
    borderColor: "#ddd",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 2,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.primary,
    borderRadius: 10,
    borderWidth: 3,
    height: 50,
    justifyContent: "center",
    width: "50%",
  },
  shareAction: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderColor: COLORS.secondary,
    borderRadius: 10,
    borderWidth: 3,
    flex: 1,
    height: 50,
    justifyContent: "center",
  },
  actionText: { color: COLORS.white, fontSize: 18, fontWeight: "700" },
});
