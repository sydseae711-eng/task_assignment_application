// HTTP handlers for skill read endpoints; thin passthrough to skillService.
import type { Request, Response } from "express";
import * as skillService from "../services/skillService.js";

export async function getAllSkills(_req: Request, res: Response) {
  const skills = await skillService.getAllSkills();
  res.json({ data: skills });
}

export async function getSkillById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const skill = await skillService.getSkillById(id);
  res.json({ data: skill });
}
