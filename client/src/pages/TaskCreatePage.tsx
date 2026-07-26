// Page for creating a task: title, optional skills (or AI auto-detection), nested subtasks, and developer assignment.
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createTask, getSkills, getDevelopers } from "../api/index.ts";
import type { Skill, Developer, SubtaskInput } from "../types/index.ts";
import SubtaskForm from "../components/SubtaskForm.tsx";
import { hasBlankSubtaskTitle } from "../utils/subtaskValidation.ts";

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<number | undefined>();
  const [subtasks, setSubtasks] = useState<SubtaskInput[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSkills().then(setSkills).catch(() => setError("Failed to load skills"));
    getDevelopers().then(setDevelopers).catch(() => setError("Failed to load developers"));
  }, []);

  const toggleSkill = (skillId: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const parentValid = title.trim().length > 0;

  const hasSkills = selectedSkillIds.length > 0;

  const filteredDevelopers = useMemo(() => {
    if (!hasSkills) return [];
    return developers.filter((dev) =>
      selectedSkillIds.every((skillId) =>
        dev.skills.some((ds) => ds.skill.id === skillId)
      )
    );
  }, [developers, selectedSkillIds, hasSkills]);

  useEffect(() => {
    setSelectedDeveloperId(undefined);
  }, [selectedSkillIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (hasBlankSubtaskTitle(subtasks)) {
      setError("All subtasks must have a title");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createTask({
        title: title.trim(),
        skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
        developerId: selectedDeveloperId,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
      });
      navigate("/tasks");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <textarea
              id="title"
              rows={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task description..."
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Skills <span className="text-gray-400">(optional)</span>
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Leave empty to auto-detect skills using AI
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => {
                const isSelected = selectedSkillIds.includes(skill.id);
                return (
                  <label
                    key={skill.id}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-100 border-blue-300 text-blue-800"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSkill(skill.id)}
                      className="sr-only"
                    />
                    {skill.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-gray-700">Subtasks</h3>
              <span className="text-xs text-gray-400">(optional)</span>
            </div>

            <SubtaskForm
              subtasks={subtasks}
              onChange={setSubtasks}
              skills={skills}
              parentValid={parentValid}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="mb-0">
            <label htmlFor="developer" className="block text-sm font-medium text-gray-700 mb-2">
              Assign Developer <span className="text-gray-400">(optional)</span>
            </label>
            <select
              id="developer"
              value={selectedDeveloperId ?? ""}
              onChange={(e) => setSelectedDeveloperId(e.target.value ? Number(e.target.value) : undefined)}
              disabled={!hasSkills}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="">
                {!hasSkills ? "Select skill(s) first" : "No preference"}
              </option>
              {filteredDevelopers.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/tasks")}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
