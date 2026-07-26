// HTTP handlers for developer read endpoints; thin passthrough to developerService.
import type { Request, Response } from "express";
import * as developerService from "../services/developerService.js";

export async function getAllDevelopers(_req: Request, res: Response) {
  const developers = await developerService.getAllDevelopers();
  res.json({ data: developers });
}

export async function getDeveloperById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const developer = await developerService.getDeveloperById(id);
  res.json({ data: developer });
}
