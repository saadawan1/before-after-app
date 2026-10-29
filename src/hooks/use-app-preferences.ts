import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../constants";
import { readJSON, writeJSON } from "../services/storage";
import type { AppInfo, AppPreferences } from "../types";

type LegacyInfo = {
  council?: unknown;
  tehsil?: unknown;
  district?: unknown;
  tag?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const useAppPreferences = () => {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [showTag, setShowTag] = useState(true);
  const [sameTagForAll, setSameTagForAll] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        const [storedInfo, storedShowTag, storedSameTag] = await Promise.all([
          readJSON<unknown>(STORAGE_KEYS.council),
          readJSON(STORAGE_KEYS.showTag, true),
          readJSON(STORAGE_KEYS.sameTag, true),
        ]);
        if (!active) return;

        let normalizedInfo: AppInfo | null = null;
        let migratedInfo: AppInfo | null = null;

        if (isRecord(storedInfo)) {
          const legacyInfo: LegacyInfo = storedInfo;
          if (legacyInfo.council || legacyInfo.tehsil || legacyInfo.district) {
            const legacyTag = [
              legacyInfo.council,
              legacyInfo.tehsil,
              legacyInfo.district,
            ]
              .filter((value) => typeof value === "string")
              .map((value) => value.trim())
              .filter(Boolean)
              .join(" | ");
            if (legacyTag) {
              migratedInfo = { tag: legacyTag };
              normalizedInfo = migratedInfo;
            }
          } else if (
            typeof legacyInfo.tag === "string" &&
            legacyInfo.tag.trim()
          ) {
            normalizedInfo = { tag: legacyInfo.tag.trim() };
          }
        }

        if (migratedInfo) {
          try {
            await writeJSON(STORAGE_KEYS.council, migratedInfo);
          } catch (error) {
            console.warn("Could not persist migrated settings:", error);
          }
        }
        if (!active) return;

        setInfo(normalizedInfo);
        setShowTag(typeof storedShowTag === "boolean" ? storedShowTag : true);
        setSameTagForAll(
          typeof storedSameTag === "boolean" ? storedSameTag : true,
        );
      } catch (error) {
        console.error("Could not initialize the app:", error);
      } finally {
        if (active) setIsReady(true);
      }
    };

    initialize();
    return () => {
      active = false;
    };
  }, []);

  const saveInfo = useCallback(async (nextInfo: AppInfo) => {
    await writeJSON(STORAGE_KEYS.council, nextInfo);
    setInfo(nextInfo);
  }, []);

  const saveShowTag = useCallback(async (value: boolean) => {
    await writeJSON(STORAGE_KEYS.showTag, value);
    setShowTag(value);
  }, []);

  const saveSameTagForAll = useCallback(async (value: boolean) => {
    await writeJSON(STORAGE_KEYS.sameTag, value);
    setSameTagForAll(value);
  }, []);

  const value = useMemo<AppPreferences>(
    () => ({
      info,
      saveInfo,
      showTag,
      saveShowTag,
      sameTagForAll,
      saveSameTagForAll,
    }),
    [info, sameTagForAll, saveInfo, saveSameTagForAll, saveShowTag, showTag],
  );

  return { isReady, value };
};
