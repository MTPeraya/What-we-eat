export function buildMapLinks(params: { lat: number; lng: number; name?: string }) {
  const { lat, lng, name } = params;
  const q = name ? encodeURIComponent(name) : `${lat},${lng}`;
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    apple: `http://maps.apple.com/?q=${q}&ll=${lat},${lng}`,
  };
}
