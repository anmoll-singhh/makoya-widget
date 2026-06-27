/**
 * LoginForm.tsx — v7 restyled login form.
 *
 * PRESERVES the existing Supabase email/password auth logic:
 *  - signIn: signInWithPassword → redirect to /dashboard (or ?next= param)
 *  - createAccount: signUp with email+password
 *  - Real error states (wrong credentials, etc.)
 *
 * ADDS per the v7 mockup (docs/makoya_login.html):
 *  - Show/hide password eye toggle (keyboard-operable)
 *  - Remember me checkbox (visual; browser native remember-me)
 *  - Forgot password link (mailto stub; no magic-link mode in v7)
 *  - DISABLED "Continue with Google" button: aria-disabled, "coming soon" badge
 *  - "New to Makoya? Start free" → /login?mode=signup or existing signup flow
 *  - Trust row: GDPR-ready · WCAG-built (SOC 2 dropped — not held)
 *
 * The form does NOT wire OAuth — Google SSO is intentionally stubbed with
 * aria-disabled="true" and a "coming soon" label, visible but not operable.
 *
 * BLOCK 26 additions (mobile-motion-hardening, Lane B):
 *  - The plain submit button is now the foundation's <LoadingButton>: instead of a
 *    "Signing in…" text swap it morphs into the brand "scan" animation (drawing
 *    ring + radar sweep + orbiting pulse) and a draw-on checkmark on success. We
 *    hold the success state briefly before redirecting so the user SEES the check.
 *  - A "Caught in 4K" SQL-injection gag: BEFORE the real auth call we run the
 *    inputs through a client-side honeypot (injection-honeypot.ts). On a match we
 *    pop an accessible modal and skip auth entirely. This is THEATRE, not security
 *    — real protection is Supabase/PostgREST parameterised queries (see the
 *    honeypot file). The honest auth path is otherwise untouched.
 */

"use client";

import { useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/motion/LoadingButton";
import { detectSqlInjection } from "./injection-honeypot";
import { CaughtIn4kModal } from "./CaughtIn4kModal";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  // `success` drives the LoadingButton's draw-on checkmark; we set it true on a
  // good auth and hold it ~900ms before navigating so the morph is actually seen.
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // The "Caught in 4K" gag modal — opened only when the honeypot trips.
  const [caught, setCaught] = useState(false);

  const supabase = () => getBrowserSupabase();
  const reset = () => { setError(null); setInfo(null); };

  /**
   * Client-side honeypot check. Returns true (and opens the gag) when the inputs
   * look like an injection/probe. THEATRE only — real protection is the backend's
   * parameterised queries; this just skips the auth call for an obvious payload.
   */
  function trippedHoneypot(): boolean {
    if (detectSqlInjection(email, password)) {
      setCaught(true);
      return true;
    }
    return false;
  }

  // Briefly show the success checkmark, then hand off to the redirect.
  function redirectWithFlourish() {
    setSuccess(true);
    window.setTimeout(() => {
      window.location.href = getNextUrl();
    }, 900);
  }

  // Read ?next= from current URL for post-login redirect
  function getNextUrl(): string {
    if (typeof window === "undefined") return "/dashboard";
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    // Sanitise: only allow same-origin relative paths
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return "/dashboard";
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    reset();
    // Gag check FIRST — never even reach the network for an obvious payload.
    if (trippedHoneypot()) return;
    setBusy(true);
    const { error: authError } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) {
      setError("Wrong email or password. New here? Click “Start free” below.");
      return;
    }
    redirectWithFlourish();
  }

  async function createAccount(e: React.MouseEvent) {
    e.preventDefault();
    reset();
    // Same gag guard on the sign-up path (it also forwards input to auth).
    if (trippedHoneypot()) return;
    if (!email || password.length < 6) {
      setError("Enter your email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    const { data, error: signUpError } = await supabase().auth.signUp({ email, password });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      redirectWithFlourish();
    } else {
      setInfo("Account created! If email confirmation is on, check your inbox — otherwise just sign in.");
    }
  }

  return (
    <>
    <form onSubmit={signIn} noValidate>
      {/* Email */}
      <label className="login-label" htmlFor="lf-email">Work email</label>
      <div className="login-field">
        <i className="ti ti-mail field-icon" aria-hidden="true" />
        <input
          id="lf-email"
          className="login-input"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>

      {/* Password */}
      <label className="login-label" htmlFor="lf-password">Password</label>
      <div className="login-field">
        <i className="ti ti-lock field-icon" aria-hidden="true" />
        <input
          id="lf-password"
          className="login-input"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••"
        />
        <button
          type="button"
          className="eye-btn"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
        >
          <i className={showPassword ? "ti ti-eye-off" : "ti ti-eye"} aria-hidden="true" />
        </button>
      </div>

      {/* Remember me + Forgot password */}
      <div className="login-rowb">
        <label className="remember-label">
          <input type="checkbox" defaultChecked style={{ width: "auto", height: "auto", padding: 0 }} />
          Remember me
        </label>
        {/* Self-serve password reset isn't wired yet; route to support honestly
            rather than render a control that silently does nothing. */}
        <a
          href="mailto:support@makoya.app?subject=Password%20reset"
          style={{ color: "inherit", font: "inherit", textDecoration: "none" }}
        >Forgot password?</a>
      </div>

      {/* Sign in — the showcase morph button. While `busy`, the label crossfades
          into the brand "scan" animation; on `success` it draws a checkmark. */}
      <LoadingButton
        type="submit"
        className="login-btn"
        loading={busy}
        success={success}
        disabled={success}
        busyLabel="Signing in…"
        successLabel="Signed in"
      >
        Sign in
        <i className="ti ti-arrow-right" aria-hidden="true" style={{ fontSize: 18 }} />
      </LoadingButton>

      {/* OR divider */}
      <div className="login-div" role="separator" aria-hidden="true">or</div>

      {/* Google SSO — disabled / coming soon */}
      <button
        type="button"
        className="login-sso"
        aria-disabled="true"
        tabIndex={0}
        onClick={(e) => e.preventDefault()}
        title="Google sign-in is coming soon"
      >
        <i className="ti ti-brand-google" aria-hidden="true" style={{ fontSize: 18 }} />
        Continue with Google
        <span className="login-sso-label">coming soon</span>
      </button>

      {/* Error / info banners */}
      {error && <div className="login-error" role="alert">{error}</div>}
      {info && <div className="login-info" role="status">{info}</div>}

      {/* New user CTA */}
      <div className="login-foot">
        New to Makoya?{" "}
        <button
          type="button"
          onClick={createAccount}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", font: "inherit", textDecoration: "underline" }}
        >
          Start free →
        </button>
      </div>

      {/* Trust row */}
      <div className="login-trust">
        <i className="ti ti-shield-check" aria-hidden="true" style={{ fontSize: 14 }} />
        GDPR-ready · WCAG-built
      </div>
    </form>

      {/* The playful gag. Honest: client-side theatre, not real protection. */}
      <CaughtIn4kModal open={caught} onClose={() => setCaught(false)} />
    </>
  );
}
