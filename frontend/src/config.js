// Frontend configuration
const DEFAULT_API_URL = 'https://what-we-eat.onrender.com';
const ENV_API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '';

const LOCAL_HOST_PATTERN = /localhost|127\.0\.0\.1|::1/i;
const isBrowser = typeof window !== 'undefined';
const currentHostname = isBrowser && window?.location ? window.location.hostname : '';
const isCurrentHostLocal = LOCAL_HOST_PATTERN.test(currentHostname);

// Check if current host is a local network IP (192.168.x.x, 10.x.x.x, etc.)
function isLocalNetworkIP(hostname) {
  if (!hostname) return false;
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p))) {
    const [a, b] = parts;
    if (a === 192 && b === 168) return true; // 192.168.x.x
    if (a === 10) return true; // 10.x.x.x
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.x.x - 172.31.x.x
    if (a === 169 && b === 254) return true; // 169.254.x.x (link-local)
  }
  return false;
}

const isCurrentHostNetworkIP = isLocalNetworkIP(currentHostname);

// If accessing from local network IP and backend URL uses localhost, replace with network IP
let resolvedApiUrl = ENV_API_URL || DEFAULT_API_URL;
if (isCurrentHostNetworkIP && ENV_API_URL && LOCAL_HOST_PATTERN.test(ENV_API_URL)) {
  // Replace localhost/127.0.0.1 with the current hostname
  resolvedApiUrl = ENV_API_URL.replace(LOCAL_HOST_PATTERN, currentHostname);
  console.log('[Config] Detected local network access, using backend:', resolvedApiUrl);
}

const shouldForceDefault =
  !!ENV_API_URL && LOCAL_HOST_PATTERN.test(ENV_API_URL) && !isCurrentHostLocal && !isCurrentHostNetworkIP;

export const API_URL = shouldForceDefault
  ? DEFAULT_API_URL
  : resolvedApiUrl;

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
    wishlist: `${API_URL}/api/favorites`,

  }
};


