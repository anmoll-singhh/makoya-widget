import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { isValidPlan } from "@/lib/admin-constants";
import { createCustomer } from "@/lib/admin";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { email?: unknown; domain?: unknown; plan?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const domain = typeof body.domain === "string" ? body.domain.trim() : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "invalid email" }, { status: 400 });
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });
  const plan = isValidPlan(body.plan) ? body.plan : undefined;

  try {
    const result = await createCustomer({ email, domain, plan });
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "create failed" }, { status: 500 });
  }
}
