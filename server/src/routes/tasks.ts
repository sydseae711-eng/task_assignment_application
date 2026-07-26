// Route table for /api/tasks.
import { Router } from "express";
import * as taskController from "../controllers/taskController.js";

const router = Router();

router.get("/", taskController.getAllTasks);
router.get("/:id", taskController.getTaskById);
router.post("/", taskController.createTask);
router.patch("/:id", taskController.updateTask);

export default router;
