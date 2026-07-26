import type { Request, Response, NextFunction } from "express";

export interface SubtaskInput {
  title: string;
  skillIds?: number[];
  subtasks?: SubtaskInput[];
}

export interface TaskCreateInput {
  title: string;
  skillIds?: number[];
  developerId?: number;
  subtasks?: SubtaskInput[];
}

export interface TaskUpdateInput {
  title?: string;
  developerId?: number;
  status?: "TODO" | "DONE";
}

export interface ApiResponse<T> {
  data: T;
}

export interface ErrorResponse {
  error: string;
  details?: unknown;
}

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}
