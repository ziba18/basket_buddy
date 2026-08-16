import AsyncStorage from '@react-native-async-storage/async-storage';

// A thin, best-effort read-through/write-through cache on top of
// AsyncStorage. Used to make the app feel instant: screens render whatever
// was cached from the last successful fetch immediately, then reconcile
// with fresh data (and realtime updates) once the network responds.
export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache writes are best-effort — a failure here shouldn't break the app.
  }
}
