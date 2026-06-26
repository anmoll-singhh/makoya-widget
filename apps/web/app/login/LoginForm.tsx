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
 */

"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const supabase = () => getBrowserSupabase();
  const reset = () => { setError(null); setInfo(null); };

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
    setBusy(true);
    const { error: authError } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) {
      setError("Wrong email or password. New here? Click “Start free” below.");
      return;
    }
    window.location.href = getNextUrl();
  }

  async function createAccount(e: React.MouseEvent) {
    e.preventDefault();
    reset();
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
      window.location.href = getNextUrl();
    } else {
      setInfo("Account created! If email confirmation is on, check your inbox — otherwise just sign in.");
    }
  }

  return (
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

      {/* Sign in */}
      <button type="submit" className="login-btn" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
        {!busy && <i className="ti ti-arrow-right" aria-hidden="true" style={{ fontSize: 18 }} />}
      </button>

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
  );
}
