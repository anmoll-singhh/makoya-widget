import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { isValidPlan } from "@/lib/admin-constants";
import { updateSitePlan } from "@/lib/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { plan?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (!isValidPlan(body.plan)) return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  await updateSitePlan(id, body.plan);
  return NextResponse.json({ ok: true });
}
