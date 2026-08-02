"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, Banknote, BookOpenCheck, BriefcaseBusiness, Building2, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardSignature, FileCheck2, FileKey2, FileSearch, FileText, Gauge, GitBranch, HandCoins, History, Home, KeyRound, LayoutDashboard, Menu, PackageCheck, RotateCcw, Settings, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useDemo } from "./demo-provider";

const nav = [
  ["Portfolio", "/portfolio", LayoutDashboard], ["California brokerage", "/brokerage", BriefcaseBusiness], ["Property graph", "/property-graph", GitBranch], ["Identity & access", "/access", KeyRound], ["SOV import", "/imports", UploadCloud], ["Document intake", "/documents", FileSearch], ["Source register", "/sources", FileKey2], ["Market playbooks", "/playbooks", BookOpenCheck], ["Resilience planning", "/resilience-planning", Banknote], ["Funding & execution", "/funding", HandCoins], ["Independent verification", "/verification", ClipboardSignature], ["Community", "/community", Building2], ["Policy timeline", "/policy", CalendarDays], ["Carrier notice", "/notice", FileText], ["Requirement crosswalk", "/requirements", ClipboardCheck], ["Evidence room", "/evidence", Archive], ["Renewal case", "/case", Gauge], ["Packet builder", "/packet", PackageCheck], ["Underwriter review", "/underwriter", ShieldCheck], ["Outcome", "/outcomes", FileCheck2], ["Maintenance", "/maintenance", CalendarDays], ["Reports & audit", "/reports", History], ["Settings", "/settings", Settings],
] as const;
const guide = [
  ["Find the case in danger", "/portfolio"], ["Confirm the carrier notice", "/notice"], ["Review the crosswalk", "/requirements"], ["Assign missing-evidence work", "/case"], ["Disposition a contradiction", "/evidence"], ["Generate the real packet", "/packet"], ["Request underwriter clarification", "/underwriter"], ["Respond and record the outcome", "/outcomes"], ["Show next-year reuse", "/maintenance"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const { state, act, reset, pending, notice, clearNotice } = useDemo(); const [mobile, setMobile] = useState(false);
  const step = Math.min(state.guideStep, guide.length - 1); const current = guide[step];
  const move = async (next: number) => { const bounded = Math.max(0, Math.min(guide.length - 1, next)); await act({ type: "set-guide", step: bounded, active: true }); router.push(guide[bounded][1]); };
  return <div className="app-frame">
    <a className="skip-link" href="#main">Skip to main content</a>
    <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark">F</div><div><strong>Fortify</strong><span>Colorado renewal sandbox</span></div><button className="icon-button mobile-only" onClick={() => setMobile(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="fictional-label"><span/>Fictional demo workspace</div>
      <nav aria-label="Workspace navigation">{nav.map(([label, href, Icon]) => <Link key={href} href={href} className={pathname === href ? "active" : ""} onClick={() => setMobile(false)}><Icon size={16}/>{label}</Link>)}</nav>
      <div className="sidebar-foot"><div className="avatar">MC</div><div><strong>Maya Chen</strong><span>Renewal executive</span></div></div>
    </aside>
    <div className="app-body">
      <header className="topbar"><button className="icon-button mobile-only" onClick={() => setMobile(true)} aria-label="Open navigation"><Menu size={20}/></button><div className="crumb"><span>Alpine Community Insurance</span><b>/</b><strong>{nav.find(([, href]) => pathname === href)?.[0] ?? "Demo"}</strong></div><div className="top-actions"><label className="role-select"><span>Viewing as</span><select value={state.currentRole} onChange={(event) => act({ type: "set-role", role: event.target.value as typeof state.currentRole })} aria-label="Demo role"><option value="broker">Broker</option><option value="manager">Community manager</option><option value="underwriter">Underwriter</option></select></label><Link href="/" className="icon-button" aria-label="Public home"><Home size={17}/></Link></div></header>
      {state.guideActive && <div className="guide" role="region" aria-label="Guided demo"><div className="guide-kicker">5-minute guided path <span>Step {step + 1} of {guide.length}</span></div><strong>{current[0]}</strong><div className="guide-actions"><button className="button ghost compact" disabled={step === 0 || pending} onClick={() => move(step - 1)}><ChevronLeft size={14}/>Back</button><button className="button secondary compact" disabled={pending} onClick={() => reset()}><RotateCcw size={14}/>Reset</button><button className="button ghost compact" onClick={() => act({ type: "set-guide", step, active: false })}>Exit</button><button className="button primary compact" disabled={step === guide.length - 1 || pending} onClick={() => move(step + 1)}>Next<ChevronRight size={14}/></button></div></div>}
      {!state.guideActive && <button className="resume-guide" onClick={() => act({ type: "set-guide", step, active: true })}>Resume guided demo</button>}
      <main id="main" className="main-content">{children}</main>
      {notice && <div className="toast" role="status">{notice}<button onClick={clearNotice} aria-label="Dismiss"><X size={14}/></button></div>}
    </div>
  </div>;
}
