// Page listing all tasks as an expandable tree, with inline status and developer-assignment controls.
import { useEffect, useState } from "react";
import { getTasks, getDevelopers, updateTask } from "../api/index.ts";
import type { Task, Developer } from "../types/index.ts";
import { replaceTaskInTree, countSubtasks } from "../utils/taskTree.ts";

interface TaskRowProps {
  task: Task;
  depth: number;
  developers: Developer[];
  onStatusChange: (taskId: number, status: "TODO" | "DONE") => void;
  onAssignDeveloper: (taskId: number, developerId: number | null) => void;
  getEligibleDevelopers: (skills: { skill: { id: number } }[]) => Developer[];
}

function TaskRow({
  task,
  depth,
  developers,
  onStatusChange,
  onAssignDeveloper,
  getEligibleDevelopers,
}: TaskRowProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const subtasks = task.subtasks ?? [];
  const hasSubtasks = subtasks.length > 0;
  const subtaskCount = countSubtasks(subtasks);
  const allSubtasksDone = hasSubtasks && subtaskCount.done === subtaskCount.total;
  const isSubtask = depth > 0;

  return (
    <>
      <tr className={isSubtask ? "bg-gray-50/50" : "hover:bg-gray-50"}>
        <td className="px-6 py-3 text-sm" style={{ paddingLeft: `${24 + depth * 32}px` }}>
          <div className="flex items-center gap-2">
            {hasSubtasks ? (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-gray-400 hover:text-gray-600 text-xs shrink-0 w-5"
                title={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? "▼" : "▶"}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <span className="text-gray-900">{task.title}</span>
          </div>
        </td>
        <td className="px-6 py-3 text-sm text-gray-600">
          {task.skills.map((ts) => ts.skill.name).join(", ") || "—"}
        </td>
        <td className="px-6 py-3 text-sm text-gray-600">
          {hasSubtasks ? (
            <span className={allSubtasksDone ? "text-green-600 font-medium" : "text-gray-500"}>
              {subtaskCount.done}/{subtaskCount.total} done
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="px-6 py-3 text-sm">
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value as "TODO" | "DONE")}
            disabled={hasSubtasks && !allSubtasksDone && task.status === "TODO"}
            title={hasSubtasks && !allSubtasksDone ? "Complete all subtasks first" : ""}
            className={`border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              task.status === "DONE"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-gray-50 border-gray-200 text-gray-800"
            }`}
          >
            <option value="TODO">To-do</option>
            <option value="DONE">Done</option>
          </select>
        </td>
        <td className="px-6 py-3 text-sm">
          <select
            value={task.developerId ?? ""}
            onChange={(e) =>
              onAssignDeveloper(
                task.id,
                e.target.value ? Number(e.target.value) : null
              )
            }
            className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Unassigned</option>
            {getEligibleDevelopers(task.skills).map((dev) => (
              <option key={dev.id} value={dev.id}>
                {dev.name}
              </option>
            ))}
          </select>
        </td>
      </tr>

      {expanded &&
        subtasks.map((subtask) => (
          <TaskRow
            key={subtask.id}
            task={subtask}
            depth={depth + 1}
            developers={developers}
            onStatusChange={onStatusChange}
            onAssignDeveloper={onAssignDeveloper}
            getEligibleDevelopers={getEligibleDevelopers}
          />
        ))}
    </>
  );
}

export default function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, devData] = await Promise.all([
        getTasks(),
        getDevelopers(),
      ]);
      setTasks(tasksData);
      setDevelopers(devData);
      setError(null);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (taskId: number, status: "TODO" | "DONE") => {
    try {
      const updated = await updateTask(taskId, { status });
      setTasks((prev) => replaceTaskInTree(prev, updated));
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      setError(message);
    }
  };

  const handleAssignDeveloper = async (taskId: number, developerId: number | null) => {
    try {
      const updated = await updateTask(taskId, { developerId });
      setTasks((prev) => replaceTaskInTree(prev, updated));
      setError(null);
    } catch {
      setError("Failed to assign developer");
    }
  };

  const getEligibleDevelopers = (taskSkills: { skill: { id: number } }[]) => {
    const taskSkillIds = taskSkills.map((s) => s.skill.id);
    return developers.filter((dev) =>
      taskSkillIds.every((skillId) =>
        dev.skills.some((ds) => ds.skill.id === skillId)
      )
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500 text-lg">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">No tasks yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                  Task Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignee
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  depth={0}
                  developers={developers}
                  onStatusChange={handleStatusChange}
                  onAssignDeveloper={handleAssignDeveloper}
                  getEligibleDevelopers={getEligibleDevelopers}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
