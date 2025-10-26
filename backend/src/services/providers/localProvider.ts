// MVP: Fetch data from table Restaurant (In the future just change to Google)
import prisma from "@/lib/db";

export type ProviderRestaurant = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  priceLevel: number | null;
  source: string;
};

export async function fetchNearbyRestaurants(params: {
  center?: { lat: number; lng: number };
  limit?: number;
}): Promise<ProviderRestaurant[]> {
  const limit = params.limit ?? 80;

  // ดึงหลาย ๆ ร้านเรียงโดย rating (แทนการ query ระยะทาง)
  const rows = await prisma.restaurant.findMany({
    take: limit,
    orderBy: [{ rating: "desc" }, { userRatingsTotal: "desc" }],
    select: {
      id: true,
      name: true,
      address: true,
      lat: true,
      lng: true,
      rating: true,
      priceLevel: true,
      source: true,
    },
  });

  // normalize (พร้อม fallback)
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    lat: Number(r.lat),
    lng: Number(r.lng),
    rating: r.rating ?? null,
    priceLevel: r.priceLevel ?? null,
    source: r.source,
  }));
}
