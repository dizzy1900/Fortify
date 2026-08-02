import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata = {
  title: "Sign in",
};

export const dynamic = "force-dynamic";

export default function SignInPage() {
  const mode = getRuntimeMode();
  const sandbox = mode === "sandbox";
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="sign-in-title">
        <div className="auth-brand" aria-label="Fortify">
          <span>F</span>
          <div>
            <strong>Fortify</strong>
            <small>Renewal evidence OS</small>
          </div>
        </div>
        <div className="auth-security-mark">
          <ShieldCheck size={18} aria-hidden="true" />
          {sandbox ? "Fictional sandbox" : "Organization-secured access"}
        </div>
        <h1 id="sign-in-title">
          {sandbox ? "Enter the deterministic demo." : "Sign in to your brokerage workspace."}
        </h1>
        <p>
          {sandbox
            ? "Sandbox roles are intentionally local and synthetic. They are not production identities and cannot access customer organizations."
            : "Fortify uses your organization’s configured OpenID Connect provider. Access is bound to an active membership and expires server-side."}
        </p>
        {sandbox ? (
          <Link className="button primary auth-action" href="/demo">
            Open fictional demo
          </Link>
        ) : (
          <a className="button primary auth-action" href="/api/auth/oidc/start">
            Continue with organization sign-in
          </a>
        )}
        <div className="auth-assurance">
          <strong>Access controls</strong>
          <ul>
            <li>Deny-by-default permissions are enforced on the server.</li>
            <li>Sessions, invitations, and shared access expire and can be revoked.</li>
            <li>Support access requires an explicit, time-bounded grant.</li>
          </ul>
        </div>
        <Link className="auth-home" href="/">
          Return to public overview
        </Link>
      </section>
      <aside className="auth-context" aria-label="Product context">
        <div>
          <span>Neutral evidence infrastructure</span>
          <h2>Keep catastrophe-property renewals reviewable and accountable.</h2>
          <p>
            Fortify organizes source evidence, requirements, case work, submissions,
            and recorded outcomes. It does not create a wildfire risk score or
            guarantee a carrier decision.
          </p>
        </div>
        <small>
          Carrier acceptance, renewal, pricing, and appeal outcomes are never
          guaranteed.
        </small>
      </aside>
    </main>
  );
}
