import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type RestaurantUpsertInput = {
  placeId: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
  userRatingsTotal?: number;
  source?: string;   // default "google"
  fetchedAt?: Date;  // default now()
};

export type ListArgs = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export class RestaurantService {
  /**
   * Upsert restaurants in batch by placeId (WWE-43)
   */
  async createOrUpdateMany(items: RestaurantUpsertInput[]) {
    if (!items?.length) return [];

    const ops = items.map((i) =>
      prisma.restaurant.upsert({
        where: { placeId: i.placeId },
        update: {
          name: i.name,
          address: i.address ?? "",
          lat: i.lat,
          lng: i.lng,
          rating: i.rating,
          priceLevel: i.priceLevel,
          userRatingsTotal: i.userRatingsTotal,
          source: i.source ?? "google",
          fetchedAt: i.fetchedAt ?? new Date(),
        },
        create: {
          placeId: i.placeId,
          name: i.name,
          address: i.address ?? "",
          lat: i.lat,
          lng: i.lng,
          rating: i.rating,
          priceLevel: i.priceLevel,
          userRatingsTotal: i.userRatingsTotal,
          source: i.source ?? "google",
          fetchedAt: i.fetchedAt ?? new Date(),
        },
      })
    );

    return prisma.$transaction(ops);
  }

  /**
   * Simple list with pagination (for WWE-44 verification UI)
   */
  async list({ q, page = 1, pageSize = 20 }: ListArgs) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.RestaurantWhereInput = q
      ? { name: { contains: q, mode: "insensitive" } }
      : {};

    const orderBy: Prisma.RestaurantOrderByWithRelationInput[] = [
      { rating: "desc" },
      { userRatingsTotal: "desc" },
    ];

    const [items, total] = await Promise.all([
      prisma.restaurant.findMany({ where, skip, take: pageSize, orderBy }),
      prisma.restaurant.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}

export default RestaurantService;
