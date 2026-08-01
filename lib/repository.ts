import { and, eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { getDb } from "@/db";
import { appState, auditEvents, organizations } from "@/db/schema";
import type { AuditRecord, DemoAction, DemoRole, DemoState } from "./domain";
import { buildSeedState } from "./seed";
import { LocalFileStorageAdapter } from "./storage";
import { requireSandboxRuntime } from "./runtime";
import sharp from "sharp";

const SANDBOX_ORGANIZATION_ID = "org-fortify-sandbox";
const STATE_ID = "sandbox-state";
const now = () => new Date().toISOString();
const hash = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

async function seedExhibits(state: DemoState) {
  const storage = new LocalFileStorageAdapter();
  await Promise.all(
    state.evidence.map(async (item, index) => {
      const text = `FORTIFY FICTIONAL DEMO EXHIBIT\nEvidence ID: ${item.id}\nCommunity: ${item.communityId}\nCapture date: ${item.captureDate}\nScope: ${item.scopeLabel}\nNot an inspection or certification.\n`;
      const bytes =
        item.kind === "photo"
          ? await sharp({
              create: {
                width: 640,
                height: 420,
                channels: 3,
                background: index % 2 ? "#d9e2dc" : "#ccd9d5",
              },
            })
              .composite([
                {
                  input: Buffer.from(
                    `<svg width="640" height="420"><rect x="32" y="278" width="576" height="104" fill="#102b38"/><text x="54" y="316" fill="#ffffff" font-family="Arial" font-size="22" font-weight="700">FICTIONAL DEMO EVIDENCE</text><text x="54" y="350" fill="#b9d7d3" font-family="Arial" font-size="16">${item.id} | ${item.scopeLabel}</text><circle cx="145" cy="125" r="58" fill="#7aa39a"/><path d="M65 250 L180 128 L285 250 Z" fill="#6f8f87"/><path d="M220 250 L360 88 L520 250 Z" fill="#567c75"/></svg>`,
                  ),
                },
              ])
              .jpeg({ quality: 84, chromaSubsampling: "4:4:4" })
              .toBuffer()
          : Buffer.from(text);
      item.sizeBytes = bytes.length;
      item.sha256 = hash(bytes);
      await storage.put(item.filename, bytes);
    }),
  );
}

export async function getState(): Promise<DemoState> {
  requireSandboxRuntime();
  const db = getDb();
  const row = db
    .select()
    .from(appState)
    .where(
      and(
        eq(appState.id, STATE_ID),
        eq(appState.organizationId, SANDBOX_ORGANIZATION_ID),
      ),
    )
    .get();
  if (row) return JSON.parse(row.stateJson) as DemoState;
  return resetState();
}

export async function resetState(): Promise<DemoState> {
  requireSandboxRuntime();
  const state = buildSeedState();
  await seedExhibits(state);
  const db = getDb();
  db.transaction((transaction) => {
    transaction
      .insert(organizations)
      .values({
        id: SANDBOX_ORGANIZATION_ID,
        name: "Fortify Fictional Sandbox",
        kind: "brokerage",
        fictional: true,
        createdAt: `${state.demoDate}T12:00:00.000Z`,
      })
      .onConflictDoNothing({ target: organizations.id })
      .run();
    transaction
      .insert(appState)
      .values({
        id: STATE_ID,
        organizationId: SANDBOX_ORGANIZATION_ID,
        version: 1,
        stateJson: JSON.stringify(state),
        updatedAt: now(),
      })
      .onConflictDoUpdate({
        target: appState.id,
        set: {
          organizationId: SANDBOX_ORGANIZATION_ID,
          version: 1,
          stateJson: JSON.stringify(state),
          updatedAt: now(),
        },
      })
      .run();
    for (const event of state.audit) {
      transaction
        .insert(auditEvents)
        .values({
          id: event.id,
          organizationId: SANDBOX_ORGANIZATION_ID,
          caseId: event.caseId,
          actorId: event.actor,
          action: event.action,
          detailJson: JSON.stringify({ message: event.detail, synthetic: true }),
          previousHash: event.previousHash,
          eventHash: event.hash,
          createdAt: event.at,
        })
        .onConflictDoNothing({ target: auditEvents.id })
        .run();
    }
  });
  return state;
}

function allowed(role: DemoRole, action: DemoAction["type"]) {
  if (["set-role", "set-guide"].includes(action)) return true;
  if (role === "broker") return true;
  if (role === "manager")
    return [
      "assign-task",
      "toggle-task",
      "resolve-conflict",
      "complete-maintenance",
    ].includes(action);
  return action === "request-clarification";
}

function appendAudit(
  state: DemoState,
  caseId: string | undefined,
  actor: string,
  action: string,
  detail: string,
) {
  const previous = state.audit.at(-1);
  const record: AuditRecord = {
    id: randomUUID(),
    caseId,
    actor,
    action,
    detail,
    at: now(),
    previousHash: previous?.hash,
    hash: hash(
      `${previous?.hash ?? "GENESIS"}|${caseId}|${actor}|${action}|${detail}`,
    ),
  };
  state.audit.push(record);
}

export async function applyAction(action: DemoAction): Promise<DemoState> {
  requireSandboxRuntime();
  const state = await getState();
  const auditStart = state.audit.length;
  if (!allowed(state.currentRole, action.type))
    throw new Error(`Role ${state.currentRole} cannot perform ${action.type}`);
  const actor =
    state.currentRole === "underwriter"
      ? "Fictional carrier reviewer"
      : state.currentRole === "manager"
        ? "Community manager"
        : "Maya Chen";
  switch (action.type) {
    case "set-role":
      state.currentRole = action.role;
      break;
    case "set-guide":
      state.guideStep = action.step;
      state.guideActive = action.active;
      break;
    case "replace-notice": {
      const notice = state.notices.find((item) => item.id === action.noticeId);
      if (!notice) throw new Error("Notice not found");
      notice.filename = action.filename;
      notice.format = action.format;
      notice.rawText = action.rawText;
      notice.fields = action.fields;
      notice.confirmed = false;
      notice.receivedDate = state.demoDate;
      const submission = state.submissions.find(
        (item) => item.caseId === notice.caseId,
      );
      if (submission) {
        submission.confirmedBy = undefined;
        submission.confirmedAt = undefined;
        submission.status = "draft";
      }
      appendAudit(
        state,
        notice.caseId,
        actor,
        "Notice source replaced",
        `${action.filename} parsed locally; all extracted values require new human confirmation.`,
      );
      break;
    }
    case "confirm-notice": {
      const notice = state.notices.find((item) => item.id === action.noticeId);
      if (!notice) throw new Error("Notice not found");
      notice.fields = notice.fields.map((field) => ({
        ...field,
        confirmed: action.fields[field.key] ?? field.confirmed,
        confirmedByHuman: true,
      }));
      notice.confirmed = true;
      appendAudit(
        state,
        notice.caseId,
        actor,
        "Notice fields confirmed",
        "Seven extracted fields reviewed and confirmed by a human.",
      );
      break;
    }
    case "add-evidence": {
      if (state.evidence.some((item) => item.id === action.evidence.id))
        throw new Error("Evidence already exists");
      const community = state.communities.find(
        (item) => item.id === action.evidence.communityId,
      );
      if (!community) throw new Error("Community not found");
      state.evidence.push(action.evidence);
      community.evidenceIds.push(action.evidence.id);
      appendAudit(
        state,
        community.caseId,
        actor,
        "Evidence uploaded",
        `${action.evidence.filename} stored with SHA-256 ${action.evidence.sha256}. Human review remains pending.`,
      );
      break;
    }
    case "assign-task":
      state.tasks.push({
        id: randomUUID(),
        caseId: action.caseId,
        title: action.title,
        owner: action.owner,
        dueDate: action.dueDate,
        status: "open",
        requirementId: action.requirementId,
      });
      appendAudit(
        state,
        action.caseId,
        actor,
        "Task assigned",
        `${action.title} assigned to ${action.owner}.`,
      );
      break;
    case "toggle-task": {
      const task = state.tasks.find((item) => item.id === action.taskId);
      if (!task) throw new Error("Task not found");
      task.status = task.status === "open" ? "done" : "open";
      appendAudit(
        state,
        task.caseId,
        actor,
        "Task status changed",
        `${task.title}: ${task.status}.`,
      );
      break;
    }
    case "resolve-conflict": {
      const item = state.evidence.find(
        (entry) => entry.id === action.evidenceId,
      );
      if (!item) throw new Error("Evidence not found");
      const linked = item.conflictWith;
      item.conflictWith = undefined;
      if (linked) {
        const counterpart = state.evidence.find((entry) => entry.id === linked);
        if (counterpart) counterpart.conflictWith = undefined;
      }
      item.humanReviewed = true;
      const requirement = state.requirements.find((entry) =>
        item.requirementIds.includes(entry.id),
      );
      if (requirement) requirement.status = "partial";
      appendAudit(
        state,
        state.communities.find((entry) => entry.id === item.communityId)
          ?.caseId,
        actor,
        "Evidence contradiction dispositioned",
        `${item.filename} retained as the current broker-reviewed version.`,
      );
      break;
    }
    case "update-letter": {
      const submission = state.submissions.find(
        (item) => item.id === action.submissionId,
      );
      if (!submission) throw new Error("Submission not found");
      submission.letter = action.letter;
      appendAudit(
        state,
        submission.caseId,
        actor,
        "Submission letter draft updated",
        `Submission ${submission.id} draft updated; generation still requires explicit confirmation.`,
      );
      break;
    }
    case "confirm-submission": {
      const submission = state.submissions.find(
        (item) => item.id === action.submissionId,
      );
      if (!submission) throw new Error("Submission not found");
      const notice = state.notices.find(
        (item) => item.caseId === submission.caseId,
      );
      if (
        !notice?.confirmed ||
        notice.fields.some((field) => !field.confirmedByHuman)
      )
        throw new Error(
          "Confirm every notice field before confirming the submission",
        );
      submission.confirmedBy = actor;
      submission.confirmedAt = now();
      appendAudit(
        state,
        submission.caseId,
        actor,
        "Submission contents confirmed",
        `Submission ${submission.id} contents confirmed before generation.`,
      );
      break;
    }
    case "mark-generated": {
      const submission = state.submissions.find(
        (item) => item.id === action.submissionId,
      );
      if (!submission) throw new Error("Submission not found");
      submission.status = "generated";
      submission.packetPath = action.packetPath;
      submission.zipPath = action.zipPath;
      appendAudit(
        state,
        submission.caseId,
        actor,
        "Submission packet generated",
        `PDF and ZIP generated for submission ${submission.id}.`,
      );
      break;
    }
    case "request-clarification": {
      const submission = state.submissions.find(
        (item) => item.id === action.submissionId,
      );
      if (!submission) throw new Error("Submission not found");
      submission.status = "clarification";
      submission.clarification = action.detail;
      appendAudit(
        state,
        submission.caseId,
        actor,
        "Clarification requested",
        action.detail,
      );
      break;
    }
    case "respond-clarification": {
      const submission = state.submissions.find(
        (item) => item.id === action.submissionId,
      );
      if (!submission?.clarification)
        throw new Error("No clarification request found");
      submission.brokerResponse = action.detail;
      submission.responseReadyAt = now();
      appendAudit(
        state,
        submission.caseId,
        actor,
        "Clarification response marked ready",
        action.detail,
      );
      break;
    }
    case "complete-maintenance": {
      const item = state.maintenance.find(
        (entry) => entry.id === action.maintenanceId,
      );
      if (!item) throw new Error("Maintenance item not found");
      item.status = "complete";
      const community = state.communities.find(
        (entry) => entry.id === item.communityId,
      );
      appendAudit(
        state,
        community?.caseId,
        actor,
        "Maintenance evidence refresh completed",
        item.title,
      );
      break;
    }
    case "record-outcome": {
      const community = state.communities.find(
        (item) => item.caseId === action.caseId,
      );
      if (!community) throw new Error("Case not found");
      community.caseStatus = "resolved";
      community.outcome = {
        disposition: action.disposition,
        detail: action.detail,
        discount: action.discount,
        renewalStatus: action.renewalStatus,
        premiumChange: action.premiumChange,
        fictional: true,
        at: now(),
      };
      appendAudit(
        state,
        action.caseId,
        actor,
        "Fictional outcome recorded",
        action.detail,
      );
      break;
    }
  }
  const db = getDb();
  const current = db
    .select()
    .from(appState)
    .where(
      and(
        eq(appState.id, STATE_ID),
        eq(appState.organizationId, SANDBOX_ORGANIZATION_ID),
      ),
    )
    .get();
  if (!current) throw new Error("Sandbox state is not initialized");
  const newAuditEvents = state.audit.slice(auditStart);
  db.transaction((transaction) => {
    const update = transaction
      .update(appState)
      .set({
        version: current.version + 1,
        stateJson: JSON.stringify(state),
        updatedAt: now(),
      })
      .where(
        and(
          eq(appState.id, STATE_ID),
          eq(appState.organizationId, SANDBOX_ORGANIZATION_ID),
          eq(appState.version, current.version),
        ),
      )
      .run();
    if (update.changes !== 1)
      throw new Error("The sandbox record changed; refresh before retrying");
    for (const event of newAuditEvents) {
      transaction
        .insert(auditEvents)
        .values({
          id: event.id,
          organizationId: SANDBOX_ORGANIZATION_ID,
          caseId: event.caseId,
          actorId: event.actor,
          action: event.action,
          detailJson: JSON.stringify({ message: event.detail, synthetic: true }),
          previousHash: event.previousHash,
          eventHash: event.hash,
          createdAt: event.at,
        })
        .run();
    }
  });
  return state;
}
