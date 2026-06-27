import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { isValidPlan } from "@/lib/admin-constants";
import { createCustomer } from "@/lib/admin";
import { mintSiteToken } from "@/lib/licensing/token";
import { captureError } from "@/lib/observability";

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
    // Mint the install token server-side (the signing secret never leaves the
    // server) so the operator gets the complete handover — incl. the snippet —
    // without having to log in as the client first.
    const token = mintSiteToken(result.siteId);
    return NextResponse.json({ ...result, token }, { status: 201 });
  } catch (e: unknown) {
    captureError(e, { route: "admin/customers" });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
