// Top-level list of subtask fields for a task being created, with add/remove controls.
import type { Skill, SubtaskInput } from "../types/index.ts";
import SubtaskField from "./SubtaskField.tsx";
import { config } from "../config.ts";

interface SubtaskFormProps {
  subtasks: SubtaskInput[];
  onChange: (subtasks: SubtaskInput[]) => void;
  skills: Skill[];
  parentValid: boolean;
}

export default function SubtaskForm({ subtasks, onChange, skills, parentValid }: SubtaskFormProps) {
  const canAddChild = parentValid && subtasks.length < config.maxSubtasksPerLevel;

  const addChild = () => {
    onChange([...subtasks, { clientId: crypto.randomUUID(), title: "", skillIds: [], subtasks: [] }]);
  };

  const updateChild = (index: number, updated: SubtaskInput) => {
    const newSubtasks = [...subtasks];
    newSubtasks[index] = updated;
    onChange(newSubtasks);
  };

  const removeChild = (index: number) => {
    onChange(subtasks.filter((_, i) => i !== index));
  };

  return (
    <div>
      {subtasks.length > 0 && (
        <div className="space-y-0 mb-3">
          {subtasks.map((subtask, index) => (
            <SubtaskField
              key={subtask.clientId}
              subtask={subtask}
              index={index}
              depth={0}
              skills={skills}
              onChange={updateChild}
              onRemove={removeChild}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addChild}
        disabled={!canAddChild}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:text-gray-300 disabled:cursor-not-allowed"
      >
        + Add Subtask
      </button>
    </div>
  );
}
