import { db, auditLogsTable } from "@workspace/db";
import type { AuthedRequest } from "./auth";

export async function logAudit(
  req: AuthedRequest,
  action: "CREATE" | "UPDATE" | "DELETE",
  entity: string,
  entityId: number | undefined,
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
): Promise<void> {
  const user = req.user;
  if (!user) return;
  try {
    await db.insert(auditLogsTable).values({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action,
      entity,
      entityId: entityId ?? null,
      oldValues: oldValues ?? null,
      newValues: newValues ?? null,
    });
  } catch (err) {
    console.error("[audit] insert failed:", err);
  }
}
