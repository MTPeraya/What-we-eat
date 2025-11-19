// Frontend configuration
const DEFAULT_API_URL = 'https://what-we-eat.onrender.com';
const ENV_API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '';

const LOCAL_HOST_PATTERN = /localhost|127\.0\.0\.1|::1/i;
const isBrowser = typeof window !== 'undefined';
const isCurrentHostLocal =
  isBrowser && window?.location
    ? LOCAL_HOST_PATTERN.test(window.location.hostname)
    : false;

const shouldForceDefault =
  !!ENV_API_URL && LOCAL_HOST_PATTERN.test(ENV_API_URL) && !isCurrentHostLocal;

export const API_URL = shouldForceDefault
  ? DEFAULT_API_URL
  : ENV_API_URL || DEFAULT_API_URL;

export const config = {
  apiUrl: API_URL,
  endpoints: {
    auth: `${API_URL}/api/auth`,
    rooms: `${API_URL}/api/rooms`,
    restaurants: `${API_URL}/api/restaurants`,
    votes: `${API_URL}/api/votes`,
    ratings: `${API_URL}/api/ratings`,
    uploads: `${API_URL}/api/uploads`,
    analytics: `${API_URL}/api/admin/stats`,
    content: `${API_URL}/api/admin/content`,
  }
};


