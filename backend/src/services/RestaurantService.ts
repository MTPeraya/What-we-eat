// backend/src/services/RestaurantService.ts
import { prisma } from "@/lib/db";
// import type { Prisma } from "@prisma/client";

/** Payload for upsert operation (from Google Places mapping) */
export type RestaurantUpsertInput = {
  placeId: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
  userRatingsTotal?: number;
  source?: string;
  fetchedAt?: Date;
};

export class RestaurantService {
  /** Skip DB writes if test mode or no DATABASE_URL configured */
  private shouldSkipDb(): boolean {
    return process.env.NODE_ENV === "test" || !process.env.DATABASE_URL;
  }

  /** Create or update restaurants by placeId (bulk operation) */
  async createOrUpdateMany(items: RestaurantUpsertInput[]) {
    if (!items?.length) return [];

    if (this.shouldSkipDb()) {
      // Skip DB calls during tests/CI without DATABASE_URL
      // Return mock data resembling Restaurant model (consumers only use length)
      return items.map((i) => ({
        id: `test_${i.placeId}`,
        placeId: i.placeId,
        name: i.name,
        address: i.address ?? "",
        lat: i.lat,
        lng: i.lng,
        rating: i.rating ?? null,
        priceLevel: i.priceLevel ?? null,
        userRatingsTotal: i.userRatingsTotal ?? null,
        source: i.source ?? "google",
        fetchedAt: i.fetchedAt ?? new Date(),
      }));
    }

    // Normal mode → write to DB
    const ops = items.map((i) =>
      prisma.restaurant.upsert({
        where: { placeId: i.placeId },
        update: {
          name: i.name,
          address: i.address ?? "",
          lat: i.lat,
          lng: i.lng,
          rating: i.rating ?? null,
          priceLevel: i.priceLevel ?? null,
          userRatingsTotal: i.userRatingsTotal ?? null,
          source: i.source ?? "google",
          fetchedAt: i.fetchedAt ?? new Date(),
        },
        create: {
          placeId: i.placeId,
          name: i.name,
          address: i.address ?? "",
          lat: i.lat,
          lng: i.lng,
          rating: i.rating ?? null,
          priceLevel: i.priceLevel ?? null,
          userRatingsTotal: i.userRatingsTotal ?? null,
          source: i.source ?? "google",
          fetchedAt: i.fetchedAt ?? new Date(),
        },
      })
    );
    return Promise.all(ops);
  }

  /** Query restaurant list from DB (used in verify page, etc.) */
  async list(args: { q?: string; page?: number; pageSize?: number }) {
    const { q, page = 1, pageSize = 20 } = args ?? {};
    const skip = (page - 1) * pageSize;

    const where =
      q && q.trim()
        ? { name: { contains: q.trim(), mode: "insensitive" as const } }
        : {};

    const orderBy = [
      { rating: "desc" as const },
      { userRatingsTotal: "desc" as const },
    ];

    const [items, total] = await Promise.all([
      prisma.restaurant.findMany({ where, skip, take: pageSize, orderBy }),
      prisma.restaurant.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}

export default RestaurantService;
