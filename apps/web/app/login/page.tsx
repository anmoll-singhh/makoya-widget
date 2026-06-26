/**
 * app/login/page.tsx — v7 Login page
 *
 * Full-bleed splash background (docs/makoya_brand_splash.png) with a
 * white card on the left. Markup mirrors docs/makoya_login.html verbatim
 * for the structure; auth logic lives in <LoginForm>.
 *
 * Fonts: Satoshi (headings/body via login.css), Tabler icons (webfont).
 * The CSS import makes this a route-level isolated stylesheet — it does not
 * bleed into the dashboard or other routes.
 */

import "./login.css";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="login-body">
      <div className="login-stage">
        <div className="login-card">
          {/* Brand gem + wordmark */}
          <div className="login-brand">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2.5L27.7 9.2L27.7 22.8L16 29.5L4.3 22.8L4.3 9.2Z" stroke="#0D1B4D" strokeWidth="2" />
              <path d="M14 11L9 16L14 21" stroke="#0D1B4D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 11L23 16L18 21" stroke="#1E63FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Makoya
          </div>

          {/* Heading */}
          <h1 className="login-h1">Welcome back</h1>
          <p className="login-sub">Sign in to manage your sites, audits and reports.</p>

          {/* Form (auth logic + styles in LoginForm.tsx) */}
          <LoginForm />
        </div>
      </div>

      {/* Bottom tagline */}
      <p className="login-tag" aria-hidden="true">Built on trust. Driven by integrity.</p>
    </div>
  );
}
