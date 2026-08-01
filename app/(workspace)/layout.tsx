import { AppShell } from "@/components/app-shell";
import { DemoProvider } from "@/components/demo-provider";
import { getState } from "@/lib/repository";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) { const state = await getState(); return <DemoProvider initialState={state}><AppShell>{children}</AppShell></DemoProvider>; }
