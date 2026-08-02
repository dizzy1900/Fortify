import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FolderSearch2,
  History,
  ShieldCheck,
} from "lucide-react";

const operatingLoop = [
  [
    FolderSearch2,
    "Govern the physical record",
    "Connect property baselines, source-backed risk drivers, proposed work, evidence, and maintenance without inventing a Fortify hazard score.",
  ],
  [
    FileCheck2,
    "Separate every authority",
    "Keep specification, verified installation, model output, rating treatment, underwriting response, funding, and observed outcomes distinct.",
  ],
  [
    History,
    "Preserve the real decision loop",
    "Prepare human-reviewed market submissions, retain clarification and actual responses, and carry valid evidence into the next cycle.",
  ],
] as const;

const trustStatements = [
  "Every extracted fact and market submission requires human confirmation",
  "Evidence levels never inherit model, rating, underwriting, or funding authority",
  "Missing, stale, unsupported, or contradictory evidence remains visible",
  "Governed history is append-only or corrected through explicit supersession",
  "Physical, financial, model, and insurance outcomes are never guaranteed",
] as const;

export default function Home() {
  return (
    <main className="marketing">
      <nav className="marketing-nav">
        <Link href="/" className="brand public-brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>Fortify</strong>
            <span>Resilience recognition OS</span>
          </div>
        </Link>
        <div>
          <a href="#workflow">Operating loop</a>
          <a href="#trust">Trust</a>
          <Link href="/sign-in">Organization sign in</Link>
          <Link href="/demo" className="button primary">
            Enter fictional demo
            <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            California wildfire resilience · specialist property-risk practices
          </span>
          <h1>
            Turn verified resilience work into a submission a market can
            evaluate.
          </h1>
          <p>
            Fortify is building the governed record connecting property
            baselines, resilience investment, funding, independent
            verification, candidate model inputs, market-specific insurance
            submissions, actual responses, and maintenance.
          </p>
          <div className="hero-actions">
            <Link href="/demo" className="button primary large">
              Inspect the renewal foundation
              <ArrowRight size={17} />
            </Link>
            <a href="#workflow" className="button secondary large">
              See the product direction
            </a>
          </div>
          <div className="hero-boundary">
            <ShieldCheck size={18} />
            <span>
              Neutral evidence and decision infrastructure—not a wildfire
              model, verifier, insurer, lender, or outcome guarantee.
            </span>
          </div>
        </div>

        <div className="hero-product">
          <div className="hero-window">
            <div className="hero-window-top">
              <span />
              <span />
              <span />
              <b>Colorado renewal foundation · fictional sandbox</b>
            </div>
            <div className="hero-stats">
              <div>
                <span>Needs attention</span>
                <strong>1</strong>
                <small>Appeal deadline</small>
              </div>
              <div>
                <span>Open evidence tasks</span>
                <strong>3</strong>
                <small>Across renewals</small>
              </div>
              <div>
                <span>Next deadline</span>
                <strong>11d</strong>
                <small>Red Rock</small>
              </div>
            </div>
            <div className="hero-row urgent">
              <div className="entity-mark">RR</div>
              <p>
                <strong>Red Rock Townhomes</strong>
                <span>140 units · Jefferson County</span>
              </p>
              <div>
                <b>58%</b>
                <span>Sandbox evidence-ready</span>
              </div>
              <em>Needs attention</em>
            </div>
            <div className="hero-row">
              <div className="entity-mark">PC</div>
              <p>
                <strong>Pine Creek Condominiums</strong>
                <span>96 units · Boulder County</span>
              </p>
              <div>
                <b>78%</b>
                <span>Sandbox evidence-ready</span>
              </div>
              <em>Building</em>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <span>Built around governed decisions</span>
        <b>Isolated synthetic sandbox</b>
        <b>Human-confirmed facts</b>
        <b>Versioned provenance</b>
        <b>Real PDF + ZIP packets</b>
      </section>

      <section id="workflow" className="marketing-section">
        <span className="eyebrow">One governed chain</span>
        <h2>From physical baseline to recorded market response.</h2>
        <div className="workflow-grid">
          {operatingLoop.map(([Icon, title, body], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <Icon size={24} />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="trust" className="marketing-section trust-section">
        <div>
          <span className="eyebrow">Trust by construction</span>
          <h2>Precise about what each form of evidence can—and cannot—say.</h2>
          <p>
            Fortify may retain external model results, independent
            verification, programme decisions, and insurer responses with
            provenance. It never converts one authority into another or treats
            workflow completeness as safety, compliance, insurability, or
            market recognition.
          </p>
          <Link href="/demo" className="text-link">
            Inspect the fictional renewal workspace
            <ArrowRight size={15} />
          </Link>
        </div>
        <ul>
          {trustStatements.map((item) => (
            <li key={item}>
              <CheckCircle2 size={18} />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <footer className="marketing-footer">
        <div className="brand public-brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>Fortify</strong>
            <span>Resilience recognition OS</span>
          </div>
        </div>
        <p>
          Current demo data is fictional. Not legal, engineering, insurance,
          inspection, lending, programme, model, or actuarial advice.
        </p>
        <Link href="/demo">Enter demo</Link>
      </footer>
    </main>
  );
}
