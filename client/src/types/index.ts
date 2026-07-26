// Shared TypeScript types for domain entities (Task, Developer, Skill) and API request/response shapes.
export interface Skill {
  id: number;
  name: string;
}

export interface Developer {
  id: number;
  name: string;
  skills: { skill: Skill }[];
}

export interface Task {
  id: number;
  title: string;
  status: "TODO" | "DONE";
  developerId: number | null;
  parentId: number | null;
  skills: { skill: Skill }[];
  developer: Developer | null;
  subtasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface SubtaskInput {
  clientId: string;
  title: string;
  skillIds: number[];
  subtasks: SubtaskInput[];
}

export interface TaskCreateInput {
  title: string;
  skillIds?: number[];
  developerId?: number;
  subtasks?: SubtaskInput[];
}

export interface TaskUpdateInput {
  title?: string;
  developerId?: number | null;
  status?: "TODO" | "DONE";
}

export interface ApiResponse<T> {
  data: T;
}
