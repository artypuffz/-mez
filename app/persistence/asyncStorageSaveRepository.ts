import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SaveRepository } from "../domain/persistence/SaveRepository";
import { migrateSaveData } from "../domain/state/migrations";

const STORAGE_KEY = "comez.save";

export function createAsyncStorageSaveRepository(): SaveRepository {
  return {
    async save(state) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    async load() {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return null;
      }
      return migrateSaveData(JSON.parse(raw));
    },
    async clear() {
      await AsyncStorage.removeItem(STORAGE_KEY);
    },
  };
}
