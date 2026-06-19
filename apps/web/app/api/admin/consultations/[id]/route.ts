import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { isValidStatus } from "@/lib/admin-constants";
import { updateConsultationStatus } from "@/lib/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { status?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (!isValidStatus(body.status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
  await updateConsultationStatus(id, body.status);
  return NextResponse.json({ ok: true });
}
