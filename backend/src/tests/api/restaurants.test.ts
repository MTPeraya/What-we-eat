// backend/tests/api/restaurants.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import * as restaurantsRoute from "../../app/api/restaurants/route";

// helper: สร้าง NextRequest พร้อม header จาก middleware
const makeReq = (qs = "") =>
  new NextRequest(`http://localhost/api/restaurants${qs}`, {
    headers: new Headers([["x-request-start", String(Date.now())]]),
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/restaurants", () => {
  it("query ถูกต้อง → คืน count > 0", async () => {
    // mock Google Places มีข้อมูล
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          results: [
            {
              place_id: "p1",
              name: "Yummy Place",
              formatted_address: "BKK",
              geometry: { location: { lat: 13.7, lng: 100.5 } },
              rating: 4.4,
              price_level: 2,
              user_ratings_total: 88,
            },
          ],
        }),
      }))
    );

    const res = await restaurantsRoute.GET(makeReq("?q=restaurant"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBeGreaterThan(0);
  });

  it("query แปลก ๆ → คืน count = 0", async () => {
    // mock Google Places ว่าง
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ results: [] }),
      }))
    );

    const res = await restaurantsRoute.GET(makeReq("?q=zzzzzzzzzzzz"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(0);
  });

  it("API key ผิด → คืน 500", async () => {
    // mock ให้ Google ตอบ error (เช่น invalid key → 403)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({ error_message: "Invalid API key" }),
      }))
    );

    const res = await restaurantsRoute.GET(makeReq("?q=restaurant"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(String(body.error)).toContain("Google API error");
  });
});
