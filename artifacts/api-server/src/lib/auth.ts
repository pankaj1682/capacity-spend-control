import type { Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, type Role } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const PgStore = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export interface AuthedRequest extends Request {
  user?: { id: number; email: string; name: string; role: Role; functionId: number | null };
}

export function buildSessionMiddleware() {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET is required");
  const dbUrl = process.env["DATABASE_URL"];
  if (!dbUrl) throw new Error("DATABASE_URL is required");

  return session({
    store: new PgStore({
      conString: dbUrl,
      createTableIfMissing: true,
      tableName: "user_sessions",
    }),
    secret,
    name: "csc.sid",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  });
}

export async function loadUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const id = req.session.userId;
  if (!id) return next();
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (u) req.user = { id: u.id, email: u.email, name: u.name, role: u.role as Role, functionId: u.functionId ?? null };
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Requires one of: ${roles.join(", ")}` });
      return;
    }
    next();
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
