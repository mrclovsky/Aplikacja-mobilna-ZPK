import { useEffect, useState, useCallback } from 'react';
import { DataFile } from '../../assets/types';
import { apiService } from '../services/api';
import routesDataFallback from '../../assets/data/routesData.json';

interface UseRoutesDataResult {
  data: DataFile;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

export function useRoutesData(): UseRoutesDataResult {
  const [data, setData] = useState<DataFile>(routesDataFallback as DataFile);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const storedData = await apiService.getRoutesData();
      setData(storedData);

      try {
        const freshData = await apiService.fetchAndSaveRoutesData();
        setData(freshData);
        setLastUpdate(new Date());
      } catch (apiError) {
        console.log('API fetch failed, using stored/fallback data');
      }
    } catch (err) {
      console.error('Error loading routes data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setData(routesDataFallback as DataFile);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const freshData = await apiService.fetchAndSaveRoutesData();
      setData(freshData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error refreshing routes data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    lastUpdate,
    refresh,
  };
}
