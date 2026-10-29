import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readJSON<T>(key: string, fallback: T): Promise<T>;
export async function readJSON<T = unknown>(key: string): Promise<T | null>;
export async function readJSON<T>(key: string, fallback: T | null = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.error(`Could not read ${key}:`, error);
    return fallback;
  }
}

export const writeJSON = <T>(key: string, value: T) =>
  AsyncStorage.setItem(key, JSON.stringify(value));
