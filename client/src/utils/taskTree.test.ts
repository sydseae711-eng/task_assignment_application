// Unit tests for taskTree.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { replaceTaskInTree, countSubtasks } from "./taskTree.ts";
import type { Task } from "../types/index.ts";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 0,
    title: "t",
    status: "TODO",
    developerId: null,
    parentId: null,
    skills: [],
    developer: null,
    subtasks: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

test("replaceTaskInTree: replaces a matching root task, leaves siblings untouched", () => {
  const tasks = [makeTask({ id: 1, status: "TODO" }), makeTask({ id: 2, status: "TODO" })];
  const updated = makeTask({ id: 1, status: "DONE" });
  const result = replaceTaskInTree(tasks, updated);
  assert.equal(result[0].status, "DONE");
  assert.equal(result[1].status, "TODO");
});

test("replaceTaskInTree: preserves the existing local subtasks array on the replaced node", () => {
  const existingChild = makeTask({ id: 10, title: "child" });
  const tasks = [makeTask({ id: 1, subtasks: [existingChild] })];
  const updated = makeTask({ id: 1, status: "DONE", subtasks: [] });
  const result = replaceTaskInTree(tasks, updated);
  assert.deepEqual(result[0].subtasks, [existingChild]);
});

test("replaceTaskInTree: finds and replaces a deeply nested subtask", () => {
  const grandchild = makeTask({ id: 100, status: "TODO" });
  const child = makeTask({ id: 10, subtasks: [grandchild] });
  const tasks = [makeTask({ id: 1, subtasks: [child] })];
  const updated = makeTask({ id: 100, status: "DONE" });
  const result = replaceTaskInTree(tasks, updated);
  assert.equal(result[0].subtasks[0].subtasks[0].status, "DONE");
});

test("replaceTaskInTree: no matching id - tree returned unchanged", () => {
  const tasks = [makeTask({ id: 1, status: "TODO" })];
  const updated = makeTask({ id: 999, status: "DONE" });
  const result = replaceTaskInTree(tasks, updated);
  assert.equal(result[0].status, "TODO");
});

test("countSubtasks: no subtasks - zero total and done", () => {
  assert.deepEqual(countSubtasks([]), { total: 0, done: 0 });
  assert.deepEqual(countSubtasks(undefined), { total: 0, done: 0 });
});

test("countSubtasks: counts nested done/total correctly across levels", () => {
  const tree = [
    makeTask({ id: 1, status: "DONE" }),
    makeTask({ id: 2, status: "TODO", subtasks: [makeTask({ id: 3, status: "DONE" })] }),
  ];
  assert.deepEqual(countSubtasks(tree), { total: 3, done: 2 });
});
