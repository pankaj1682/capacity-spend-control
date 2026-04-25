import { Router, type IRouter } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/audit-logs",
  requireRole("Admin", "PMO Lead", "Finance Controller"),
  async (req, res) => {
    const { entity, action, userId, from, to, limit, offset } = req.query as Record<string, string>;
    const where = [];
    if (entity) where.push(eq(auditLogsTable.entity, entity));
    if (action) where.push(eq(auditLogsTable.action, action));
    if (userId) where.push(eq(auditLogsTable.userId, Number(userId)));
    if (from) where.push(gte(auditLogsTable.createdAt, new Date(from)));
    if (to) where.push(lte(auditLogsTable.createdAt, new Date(to)));

    const rows = await db
      .select()
      .from(auditLogsTable)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(Number(limit ?? 200))
      .offset(Number(offset ?? 0));

    res.json(
      rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userEmail: r.userEmail,
        userName: r.userName,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        oldValues: r.oldValues,
        newValues: r.newValues,
        createdAt: r.createdAt,
      }))
    );
  }
);

export default router;
