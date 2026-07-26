import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types/index.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[Error] ${err.message}`, err.stack);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
    return;
  }

  // Prisma known-request errors (e.g. unique constraint violation, foreign key failure, record not found)
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as unknown as { code: string; meta?: unknown };
    switch (prismaErr.code) {
      case "P2025":
        res.status(404).json({ error: "Record not found" });
        return;
      case "P2003":
        res.status(400).json({ error: "Foreign key constraint failed" });
        return;
      case "P2002":
        res.status(409).json({ error: "Record already exists" });
        return;
      default:
        res.status(400).json({ error: "Database error", details: prismaErr.meta });
        return;
    }
  }

  // Prisma validation errors (missing required field, invalid enum value, wrong type, etc.)
  if (err.name === "PrismaClientValidationError") {
    res.status(400).json({ error: "Invalid request data" });
    return;
  }

  // Generic errors that already carry an HTTP status (e.g. malformed JSON body from express.json())
  const genericStatus =
    (err as { status?: number; statusCode?: number }).status ??
    (err as { status?: number; statusCode?: number }).statusCode;
  if (genericStatus && genericStatus >= 400 && genericStatus < 500) {
    res.status(genericStatus).json({ error: err.message || "Bad request" });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
}
