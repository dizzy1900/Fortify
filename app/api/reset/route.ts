import { resetState } from "@/lib/repository";
export async function POST() { return Response.json(await resetState()); }
