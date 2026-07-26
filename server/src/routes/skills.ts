// Route table for /api/skills.
import { Router } from "express";
import * as skillController from "../controllers/skillController.js";

const router = Router();

router.get("/", skillController.getAllSkills);
router.get("/:id", skillController.getSkillById);

export default router;
