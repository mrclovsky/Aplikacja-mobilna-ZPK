// app/config/api.ts
// API configuration - centralized place for all API endpoints

export const API_CONFIG = {
  BASE_URL: "https://inzynierka-web-production.up.railway.app",
  ENDPOINTS: {
    POINTS: "/app/points",
    PATHS: "/app/paths",
    SETTINGS: "/app/settings",
  },
  TIMEOUT: 10000, // 10 seconds
};

export const getFullUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
