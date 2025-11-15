//backend/src/app/api/admin/content/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import prisma from "@/lib/db";
import { withCORS, preflight } from "@/lib/cors";

// --- OPTIONS ---
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return preflight("GET, OPTIONS", origin);
}

// --- GET /api/admin/content ---
export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  try {
    // Require login
    const { user } = await requireAuth(req);

    // Require ADMIN role
    if (!user || user.role !== "ADMIN") {
      return withCORS(
        NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
        origin
      );
    }

    // Fetch ratings with restaurant + user
    const ratings = await prisma.rating.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        comment: true,
        status: true,
        createdAt: true,
        restaurant: {
          select: { name: true },
        },
        user: {
          select: {
            displayName: true,
            username: true,
          },
        },
      },
    });

    const items = ratings.map((r) => ({
      id: r.id,
      content: r.comment ?? "",
      status: r.status ?? "pending",
      restaurantName: r.restaurant?.name ?? "Unknown",
      author: r.user?.displayName ?? r.user?.username ?? "Anonymous",
    }));

    return withCORS(NextResponse.json(items, { status: 200 }), origin);

  } catch (err) {
    console.error("ADMIN CONTENT ERROR:", err);
    return withCORS(
      NextResponse.json(
        { error: "CONTENT_FETCH_FAILED", details: String(err) },
        { status: 500 }
      ),
      origin
    );
  }
}
