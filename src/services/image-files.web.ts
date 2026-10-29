import type { CardImageReference, WorkCard } from "../types";

const DATABASE_NAME = "before-after-app";
const DATABASE_VERSION = 1;
const IMAGE_STORE = "images";
const STORED_URI_PREFIX = "idb://work-images/";

const runtimeUriToKey = new Map<string, string>();
let databasePromise: Promise<IDBDatabase> | null = null;

const openDatabase = () => {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("Persistent browser image storage is not available."),
    );
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGE_STORE)) {
        request.result.createObjectStore(IMAGE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
  return databasePromise;
};

const runRequest = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, mode);
    const request = operation(transaction.objectStore(IMAGE_STORE));
    let result: T;
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      result = request.result;
    };
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve(result);
  });
};

const storedUriForKey = (key: string) => `${STORED_URI_PREFIX}${key}`;

const keyFromStoredUri = (uri: string | null | undefined) =>
  uri?.startsWith(STORED_URI_PREFIX)
    ? uri.slice(STORED_URI_PREFIX.length)
    : null;

const rememberBlob = (key: string, blob: Blob) => {
  const runtimeUri = URL.createObjectURL(blob);
  runtimeUriToKey.set(runtimeUri, key);
  return runtimeUri;
};

async function hydrateUri(uri: string): Promise<string>;
async function hydrateUri(uri: null): Promise<null>;
async function hydrateUri(uri: string | null): Promise<string | null> {
  const key = keyFromStoredUri(uri);
  if (!key) return uri;

  const blob = await runRequest("readonly", (store) => store.get(key));
  return blob instanceof Blob ? rememberBlob(key, blob) : uri;
}

function serializeUri(uri: string): string;
function serializeUri(uri: null): null;
function serializeUri(uri: string | null): string | null {
  if (uri === null) return null;
  const key = runtimeUriToKey.get(uri);
  return key ? storedUriForKey(key) : uri;
}

const releaseUri = (uri: string | null | undefined) => {
  if (!uri) return;
  if (!runtimeUriToKey.has(uri)) return;
  runtimeUriToKey.delete(uri);
  URL.revokeObjectURL(uri);
};

export const persistImage = async (
  sourceUri: string,
  cardId: string,
  kind: "before" | "after",
) => {
  if (!sourceUri) throw new Error("No image was provided.");

  const response = await fetch(sourceUri);
  if (!response.ok) throw new Error("The selected image could not be read.");
  const blob = await response.blob();
  const key = `${cardId}-${kind}-${Date.now()}`;
  await runRequest("readwrite", (store) => store.put(blob, key));
  return rememberBlob(key, blob);
};

export const deleteCardImages = async (cards: CardImageReference[]) => {
  const uris = cards
    .flatMap((card) => [card.beforeUri, card.afterUri])
    .filter((uri): uri is string => typeof uri === "string");

  await Promise.all(
    uris.map(async (uri) => {
      const key = runtimeUriToKey.get(uri) || keyFromStoredUri(uri);
      if (!key) return;
      await runRequest("readwrite", (store) => store.delete(key));
      releaseUri(uri);
    }),
  );
};

export const hydrateCards = async (cards: WorkCard[]): Promise<WorkCard[]> =>
  Promise.all(
    cards.map(async (card) => ({
      ...card,
      beforeUri: await hydrateUri(card.beforeUri),
      afterUri: card.afterUri ? await hydrateUri(card.afterUri) : null,
    })),
  );

export const serializeCards = async (cards: WorkCard[]): Promise<WorkCard[]> =>
  cards.map((card) => ({
    ...card,
    beforeUri: serializeUri(card.beforeUri),
    afterUri: card.afterUri ? serializeUri(card.afterUri) : null,
  }));

export const releaseCardImages = (cards: WorkCard[]) => {
  cards.forEach((card) => {
    releaseUri(card.beforeUri);
    releaseUri(card.afterUri);
  });
};

export const prepareCapturedUri = (uri: string) => uri;
