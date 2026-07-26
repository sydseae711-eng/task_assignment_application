// Axios-based API client wrapping every backend endpoint used by the UI (tasks, developers, skills).
import axios from "axios";
import type { Task, TaskCreateInput, TaskUpdateInput, Developer, Skill, ApiResponse } from "../types/index.ts";

const api = axios.create({
  baseURL: "/api",
});

export async function getTasks(): Promise<Task[]> {
  const res = await api.get<ApiResponse<Task[]>>("/tasks");
  return res.data.data;
}

export async function getTask(id: number): Promise<Task> {
  const res = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
  return res.data.data;
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  const res = await api.post<ApiResponse<Task>>("/tasks", input);
  return res.data.data;
}

export async function updateTask(id: number, input: TaskUpdateInput): Promise<Task> {
  const res = await api.patch<ApiResponse<Task>>(`/tasks/${id}`, input);
  return res.data.data;
}

export async function getDevelopers(): Promise<Developer[]> {
  const res = await api.get<ApiResponse<Developer[]>>("/developers");
  return res.data.data;
}

export async function getSkills(): Promise<Skill[]> {
  const res = await api.get<ApiResponse<Skill[]>>("/skills");
  return res.data.data;
}
