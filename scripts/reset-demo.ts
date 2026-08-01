import { closeDb } from "../db";
import { resetState } from "../lib/repository";
const state = await resetState(); console.log(`Reset ${state.seedVersion}: ${state.communities.length} communities, ${state.evidence.length} evidence items, ${state.requirements.length} requirements.`); closeDb();
