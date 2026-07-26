// Recursive form field for a single subtask (title, skills, nested children), rendered by SubtaskForm.
import { useState } from "react";
import type { Skill, SubtaskInput } from "../types/index.ts";
import { config } from "../config.ts";

interface SubtaskFieldProps {
  subtask: SubtaskInput;
  index: number;
  depth: number;
  skills: Skill[];
  onChange: (index: number, updated: SubtaskInput) => void;
  onRemove: (index: number) => void;
}

export default function SubtaskField({
  subtask,
  index,
  depth,
  skills,
  onChange,
  onRemove,
}: SubtaskFieldProps) {
  const [collapsed, setCollapsed] = useState(false);
  // depth is 0-indexed (the first subtask level is depth 0); check the CHILD's
  // resulting depth (depth + 1) against the limit, not this node's own depth.
  const canAddChild =
    depth + 1 < config.maxSubtaskDepth && subtask.subtasks.length < config.maxSubtasksPerLevel;
  const hasChildren = subtask.subtasks.length > 0;
  const nodeValid = subtask.title.trim().length > 0;

  const updateField = (field: Partial<SubtaskInput>) => {
    onChange(index, { ...subtask, ...field });
  };

  const toggleSkill = (skillId: number) => {
    const newSkills = subtask.skillIds.includes(skillId)
      ? subtask.skillIds.filter((id) => id !== skillId)
      : [...subtask.skillIds, skillId];
    updateField({ skillIds: newSkills });
  };

  const addChild = () => {
    updateField({
      subtasks: [
        ...subtask.subtasks,
        { clientId: crypto.randomUUID(), title: "", skillIds: [], subtasks: [] },
      ],
    });
  };

  const updateChild = (childIndex: number, updated: SubtaskInput) => {
    const newSubtasks = [...subtask.subtasks];
    newSubtasks[childIndex] = updated;
    updateField({ subtasks: newSubtasks });
  };

  const removeChild = (childIndex: number) => {
    updateField({
      subtasks: subtask.subtasks.filter((_, i) => i !== childIndex),
    });
  };

  return (
    <div className={`${depth > 0 ? "ml-5 border-l-2 border-gray-200 pl-4 mt-3" : ""}`}>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          {hasChildren && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? "▶" : "▼"}
            </button>
          )}
          <input
            type="text"
            value={subtask.title}
            onChange={(e) => updateField({ title: e.target.value })}
            placeholder="Subtask title..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-400 hover:text-red-600 text-sm px-2 shrink-0"
            title="Remove subtask"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {skills.map((skill) => {
            const isOwn = subtask.skillIds.includes(skill.id);
            return (
              <label
                key={skill.id}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                  isOwn
                    ? "bg-blue-100 border-blue-300 text-blue-800"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOwn}
                  onChange={() => toggleSkill(skill.id)}
                  className="sr-only"
                />
                {skill.name}
              </label>
            );
          })}
        </div>

        {canAddChild && (
          <button
            type="button"
            onClick={addChild}
            disabled={!nodeValid}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            + Add Subtask
          </button>
        )}
      </div>

      {!collapsed && hasChildren && (
        <div className="space-y-0">
          {subtask.subtasks.map((child, childIndex) => (
            <SubtaskField
              key={child.clientId}
              subtask={child}
              index={childIndex}
              depth={depth + 1}
              skills={skills}
              onChange={updateChild}
              onRemove={removeChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
