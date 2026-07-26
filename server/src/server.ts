// App entry point: configures the Express app, mounts routes/middleware, and starts the HTTP server.
import "dotenv/config";
import express from "express";
import cors from "cors";
import taskRoutes from "./routes/tasks.js";
import developerRoutes from "./routes/developers.js";
import skillRoutes from "./routes/skills.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/tasks", taskRoutes);
app.use("/api/developers", developerRoutes);
app.use("/api/skills", skillRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
