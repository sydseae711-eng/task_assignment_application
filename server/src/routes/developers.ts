// Route table for /api/developers.
import { Router } from "express";
import * as developerController from "../controllers/developerController.js";

const router = Router();

router.get("/", developerController.getAllDevelopers);
router.get("/:id", developerController.getDeveloperById);

export default router;
