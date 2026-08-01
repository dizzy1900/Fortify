"use client";
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="empty"><strong>This workspace view could not load.</strong><span>The local record remains unchanged.</span><button className="button primary" onClick={reset}>Try again</button></div>; }
