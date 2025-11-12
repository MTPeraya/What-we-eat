// Frontend configuration
export const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'https://what-we-eat.onrender.com';

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

