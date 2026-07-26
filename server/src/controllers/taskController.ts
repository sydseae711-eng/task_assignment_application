// HTTP handlers for task CRUD endpoints; thin passthrough to taskService.
import type { Request, Response } from "express";
import * as taskService from "../services/taskService.js";

export async function getAllTasks(_req: Request, res: Response) {
  const tasks = await taskService.getAllTasks();
  res.json({ data: tasks });
}

export async function getTaskById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const task = await taskService.getTaskById(id);
  res.json({ data: task });
}

export async function createTask(req: Request, res: Response) {
  const task = await taskService.createTask(req.body);
  res.status(201).json({ data: task });
}

export async function updateTask(req: Request, res: Response) {
  const id = Number(req.params.id);
  const task = await taskService.updateTask(id, req.body);
  res.json({ data: task });
}
