// app/services/api.ts
// API service for fetching routes data from backend

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
  /**
   * Fetch points from API
   */
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

  /**
   * Fetch paths (routes) from API
   */
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

  /**
   * Fetch all routes data and save to storage
   */
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

      // Save to storage for offline use
      await storageService.saveRoutesData(routesData);

      return routesData;
    } catch (error) {
      console.error('Error fetching routes data:', error);
      throw error;
    }
  },

  /**
   * Get routes data - tries storage first, then fallback to embedded JSON
   */
  async getRoutesData(): Promise<DataFile> {
    try {
      // Try to get from storage first
      const storedData = await storageService.getRoutesData();
      if (storedData) {
        return storedData;
      }

      // If no stored data, use fallback JSON
      return routesDataFallback as DataFile;
    } catch (error) {
      console.error('Error getting routes data:', error);
      // Return fallback on any error
      return routesDataFallback as DataFile;
    }
  },
};
