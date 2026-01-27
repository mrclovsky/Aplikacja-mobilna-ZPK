import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

export function useAppSettings() {
  const [distanceToPoint, setDistanceToPoint] = useState<number>(20);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await apiService.getAppSettings();
      setDistanceToPoint(settings.distance_to_point);
    } catch (error) {
      console.error('Error loading app settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    distanceToPoint,
    isLoading,
  };
}
