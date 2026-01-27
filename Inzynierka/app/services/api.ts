import { API_CONFIG, getFullUrl } from '../config/api';
import { DataFile, Point, Route } from '../../assets/types';
import { storageService } from './storage';
import routesDataFallback from '../../assets/data/routesData.json';

interface PointsResponse {
  points: Point[];
}

interface PathsResponse {
  suggestedRoutes: Route[];
}

export class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiService = {
  async fetchPoints(): Promise<Point[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(getFullUrl(API_CONFIG.ENDPOINTS.POINTS), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(`Failed to fetch points: ${response.statusText}`, response.status);
      }

      const data: PointsResponse = await response.json();
      return data.points;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout');
        }
        throw new ApiError(`Failed to fetch points: ${error.message}`);
      }
      throw error;
    }
  },

  async fetchPaths(): Promise<{ suggestedRoutes: Route[]; myRoutes: Route[] }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(getFullUrl(API_CONFIG.ENDPOINTS.PATHS), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(`Failed to fetch paths: ${response.statusText}`, response.status);
      }

      const data: PathsResponse = await response.json();
      return {
        suggestedRoutes: data.suggestedRoutes,
        myRoutes: [],
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout');
        }
        throw new ApiError(`Failed to fetch paths: ${error.message}`);
      }
      throw error;
    }
  },

  async fetchAndSaveRoutesData(): Promise<DataFile> {
    try {
      const [points, paths] = await Promise.all([
        this.fetchPoints(),
        this.fetchPaths(),
      ]);

      const routesData: DataFile = {
        version: 1,
        points,
        suggestedRoutes: paths.suggestedRoutes,
        myRoutes: paths.myRoutes,
      };

      await storageService.saveRoutesData(routesData);

      return routesData;
    } catch (error) {
      console.error('Error fetching routes data:', error);
      throw error;
    }
  },

  async getRoutesData(): Promise<DataFile> {
    try {
      const storedData = await storageService.getRoutesData();
      if (storedData) {
        return storedData;
      }

      return routesDataFallback as DataFile;
    } catch (error) {
      console.error('Error getting routes data:', error);
      return routesDataFallback as DataFile;
    }
  },

  async fetchSettings(): Promise<{ distance_to_point: number }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(getFullUrl(API_CONFIG.ENDPOINTS.SETTINGS), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(`Failed to fetch settings: ${response.statusText}`, response.status);
      }

      const data = await response.json();
      
      await storageService.saveAppSettings(data);
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout');
        }
        throw new ApiError(`Failed to fetch settings: ${error.message}`);
      }
      throw error;
    }
  },

  async getAppSettings(): Promise<{ distance_to_point: number }> {
    try {
      const storedSettings = await storageService.getAppSettings();
      if (storedSettings) {
        return storedSettings;
      }

      return await this.fetchSettings();
    } catch (error) {
      console.error('Error getting app settings:', error);
      return { distance_to_point: 20 };
    }
  },
};
