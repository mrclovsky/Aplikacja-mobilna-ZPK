// app/services/storage.ts
// Offline storage service using AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataFile } from '../../assets/types';

const STORAGE_KEYS = {
  ROUTES_DATA: '@routes_data',
  LAST_UPDATE: '@routes_data_last_update',
};

export const storageService = {
  /**
   * Save routes data to local storage
   */
  async saveRoutesData(data: DataFile): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTES_DATA, jsonData);
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
    } catch (error) {
      console.error('Error saving routes data:', error);
      throw error;
    }
  },

  /**
   * Get routes data from local storage
   */
  async getRoutesData(): Promise<DataFile | null> {
    try {
      const jsonData = await AsyncStorage.getItem(STORAGE_KEYS.ROUTES_DATA);
      if (!jsonData) return null;
      return JSON.parse(jsonData) as DataFile;
    } catch (error) {
      console.error('Error getting routes data:', error);
      return null;
    }
  },

  /**
   * Get last update timestamp
   */
  async getLastUpdate(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('Error getting last update:', error);
      return null;
    }
  },

  /**
   * Clear all stored routes data
   */
  async clearRoutesData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.ROUTES_DATA, STORAGE_KEYS.LAST_UPDATE]);
    } catch (error) {
      console.error('Error clearing routes data:', error);
      throw error;
    }
  },
};
