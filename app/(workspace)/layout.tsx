import { AppShell } from "@/components/app-shell";
import { DemoProvider } from "@/components/demo-provider";
import { getState } from "@/lib/repository";
import { getRuntimeMode } from "@/lib/runtime";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) { if (getRuntimeMode() !== "sandbox") notFound(); const state = await getState(); return <DemoProvider initialState={state}><AppShell>{children}</AppShell></DemoProvider>; }
