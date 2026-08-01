"use client";
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="route-state"><h1>The workspace could not be loaded</h1><p>Your local evidence record was not changed.</p><button className="button primary" onClick={reset}>Try again</button></main>; }
