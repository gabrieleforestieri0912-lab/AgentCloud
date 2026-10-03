import { NextResponse } from "next/server";
import { COUPON_MAX_USES } from "@/lib/coupon";
import { tryConsumeCoupon } from "@/lib/coupon-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    const result = tryConsumeCoupon(code);
    if (!result.ok) {
      if (result.error === "INVALID_CODE") {
        return NextResponse.json(
          { error: "Invalid coupon code", code: "INVALID_CODE" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Coupon uses exhausted", code: "INSUFFICIENT_USES" },
        { status: 409 },
      );
    }

    return NextResponse.json({ remaining: result.remaining, max: COUPON_MAX_USES, success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
