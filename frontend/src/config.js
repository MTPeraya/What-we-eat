// Frontend configuration
const DEFAULT_API_URL = 'https://what-we-eat.onrender.com';
const DEFAULT_LOCAL_API_URL = 'http://localhost:4001';
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

// Determine API URL
let resolvedApiUrl;
if (ENV_API_URL) {
  // Use environment variable if provided
  resolvedApiUrl = ENV_API_URL;
  
  // If accessing from local network IP and backend URL uses localhost, replace with network IP
  if (isCurrentHostNetworkIP && LOCAL_HOST_PATTERN.test(ENV_API_URL)) {
    resolvedApiUrl = ENV_API_URL.replace(LOCAL_HOST_PATTERN, currentHostname);
    console.log('[Config] Detected local network access, using backend:', resolvedApiUrl);
  }
} else if (isCurrentHostLocal || isCurrentHostNetworkIP) {
  // Default to localhost backend for local development
  resolvedApiUrl = isCurrentHostNetworkIP 
    ? `http://${currentHostname}:4001`
    : DEFAULT_LOCAL_API_URL;
  console.log('[Config] Using local backend (no env var set):', resolvedApiUrl);
} else {
  // Use production default
  resolvedApiUrl = DEFAULT_API_URL;
  console.log('[Config] Using production backend:', resolvedApiUrl);
}

const shouldForceDefault =
  !!ENV_API_URL && LOCAL_HOST_PATTERN.test(ENV_API_URL) && !isCurrentHostLocal && !isCurrentHostNetworkIP;

export const API_URL = shouldForceDefault
  ? DEFAULT_API_URL
  : resolvedApiUrl;

// Validate API_URL format
if (API_URL && !API_URL.match(/^https?:\/\//)) {
  console.error('[Config] Invalid API_URL format (missing protocol):', API_URL);
}

// Log final API URL for debugging
console.log('[Config] Final API_URL:', API_URL);

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


