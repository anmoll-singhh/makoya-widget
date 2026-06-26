"use client";
/**
 * /accept-invite — the landing page an invited teammate opens from their invite
 * link (built by the Account → Team screen as `/accept-invite?token=…`).
 *
 * Flow, kept deliberately small (no v3 dashboard chrome):
 *   1. Read the one-time `token` from the URL (via window.location so the page
 *      needs no Suspense boundary and stays statically renderable).
 *   2. Require a session — if the visitor isn't signed in we send them to
 *      /login with a `next` back to this exact URL so they return here after.
 *   3. POST { token } to /api/team/accept (authed, same-origin → forwards the
 *      session cookie). 200 → "You've joined the team"; anything else → a single
 *      generic failure message (we never echo why, to avoid leaking invite state).
 *
 * Resilience: every branch renders something calm; no state ever shows
 * `undefined`, and a network error degrades to the same generic failure copy.
 */
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Phase = "checking" | "needs-login" | "no-token" | "accepting" | "success" | "error";

export default function AcceptInvitePage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    // Read the token client-side (avoids useSearchParams' Suspense requirement).
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(t);
    if (!t) {
      setPhase("no-token");
      return;
    }

    let live = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await getBrowserSupabase().auth.getUser();
        if (!live) return;
        if (!user) {
          setPhase("needs-login");
          return;
        }
        setPhase("accepting");
        const res = await fetch("/api/team/accept", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: t }),
        });
        if (!live) return;
        setPhase(res.ok ? "success" : "error");
      } catch {
        if (live) setPhase("error");
      }
    })();

    return () => {
      live = false;
    };
  }, []);

  const loginHref = `/login?next=${encodeURIComponent(
    `/accept-invite?token=${encodeURIComponent(token)}`
  )}`;

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "40px 20px",
        background: "#f6f8fc",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        color: "#0c1426",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #e7eaf1",
          borderRadius: 16,
          padding: "32px 28px",
          boxShadow: "0 8px 28px rgba(15,28,77,.08)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>
          Join your team on Makoya
        </h1>

        {phase === "checking" && (
          <p role="status" style={{ marginTop: 14, fontSize: 14, color: "#5b6478", lineHeight: 1.6 }}>
            Checking your invite…
          </p>
        )}

        {phase === "no-token" && (
          <p role="alert" style={{ marginTop: 14, fontSize: 14, color: "#8a5200", lineHeight: 1.6 }}>
            This invite link is missing its token. Please use the exact link your teammate sent you.
          </p>
        )}

        {phase === "needs-login" && (
          <>
            <p style={{ marginTop: 14, fontSize: 14, color: "#5b6478", lineHeight: 1.6 }}>
              Sign in (or create your account) with the email this invite was sent to, then you&apos;ll
              join the team automatically.
            </p>
            <a
              href={loginHref}
              style={{
                display: "inline-block",
                marginTop: 18,
                background: "#1e63ff",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                padding: "11px 18px",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Continue to sign in
            </a>
          </>
        )}

        {phase === "accepting" && (
          <p role="status" style={{ marginTop: 14, fontSize: 14, color: "#5b6478", lineHeight: 1.6 }}>
            Joining the team…
          </p>
        )}

        {phase === "success" && (
          <>
            <p style={{ marginTop: 14, fontSize: 15, color: "#1d5e3f", fontWeight: 600 }}>
              You&apos;ve joined the team ✓
            </p>
            <p style={{ marginTop: 8, fontSize: 14, color: "#5b6478", lineHeight: 1.6 }}>
              Your access is ready.
            </p>
            <a
              href="/dashboard"
              style={{
                display: "inline-block",
                marginTop: 18,
                background: "#1e63ff",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                padding: "11px 18px",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Go to your dashboard
            </a>
          </>
        )}

        {phase === "error" && (
          <>
            <p role="alert" style={{ marginTop: 14, fontSize: 14, color: "#8a5200", lineHeight: 1.6 }}>
              We couldn&apos;t accept this invite. It may have already been used or expired, or it was
              sent to a different email. Ask whoever invited you to send a fresh invite.
            </p>
            <a
              href="/dashboard"
              style={{
                display: "inline-block",
                marginTop: 18,
                border: "1px solid #e7eaf1",
                color: "#0c1426",
                fontWeight: 600,
                fontSize: 14,
                padding: "11px 18px",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Go to dashboard
            </a>
          </>
        )}
      </div>
    </main>
  );
}
