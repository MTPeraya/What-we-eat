import { z } from 'zod';

export const createRoomSchema = z.object({
  budgetMin: z.number().int().min(0).optional(),
  budgetMax: z.number().int().min(0).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional()
});

export const voteSchema = z.object({
  roomId: z.string().min(1),
  restaurantId: z.string().min(1),
  decision: z.boolean()
});
