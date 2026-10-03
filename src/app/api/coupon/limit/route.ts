import { NextResponse } from "next/server";
import { COUPON_MAX_USES } from "@/lib/coupon";
import { getCouponRemaining } from "@/lib/coupon-server";

export async function GET() {
  const remaining = getCouponRemaining();
  return NextResponse.json({ remaining, max: COUPON_MAX_USES, active: remaining > 0 });
}
