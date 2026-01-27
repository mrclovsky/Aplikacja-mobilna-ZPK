import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataFile } from '../../assets/types';

const STORAGE_KEYS = {
  ROUTES_DATA: '@routes_data',
  LAST_UPDATE: '@routes_data_last_update',
  APP_SETTINGS: '@app_settings',
  SETTINGS_LAST_UPDATE: '@settings_last_update',
};

export const storageService = {
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

  async getLastUpdate(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('Error getting last update:', error);
      return null;
    }
  },

  async clearRoutesData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.ROUTES_DATA, STORAGE_KEYS.LAST_UPDATE]);
    } catch (error) {
      console.error('Error clearing routes data:', error);
      throw error;
    }
  },

  async saveAppSettings(settings: { distance_to_point: number }): Promise<void> {
    try {
      const jsonData = JSON.stringify(settings);
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, jsonData);
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS_LAST_UPDATE, new Date().toISOString());
    } catch (error) {
      console.error('Error saving app settings:', error);
      throw error;
    }
  },

  async getAppSettings(): Promise<{ distance_to_point: number } | null> {
    try {
      const jsonData = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (!jsonData) return null;
      return JSON.parse(jsonData);
    } catch (error) {
      console.error('Error getting app settings:', error);
      return null;
    }
  },
};
