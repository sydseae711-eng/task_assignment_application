// Unit tests for taskService.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findFirstTodoSubtask, checkSubtaskLimits } from "./taskService.js";

test("findFirstTodoSubtask: no subtasks - undefined", () => {
  assert.equal(findFirstTodoSubtask([]), undefined);
});

test("findFirstTodoSubtask: single DONE subtask - undefined", () => {
  assert.equal(findFirstTodoSubtask([{ title: "A", status: "DONE" }]), undefined);
});

test("findFirstTodoSubtask: single TODO subtask - returns its title", () => {
  assert.equal(findFirstTodoSubtask([{ title: "A", status: "TODO" }]), "A");
});

test("findFirstTodoSubtask: finds the TODO one among several DONE ones", () => {
  const subtasks = [
    { title: "A", status: "DONE" },
    { title: "B", status: "TODO" },
    { title: "C", status: "DONE" },
  ];
  assert.equal(findFirstTodoSubtask(subtasks), "B");
});

test("findFirstTodoSubtask: all DONE - undefined", () => {
  const subtasks = [
    { title: "A", status: "DONE" },
    { title: "B", status: "DONE" },
  ];
  assert.equal(findFirstTodoSubtask(subtasks), undefined);
});

test("checkSubtaskLimits: within default limits (depth 3, 10 per level) - undefined", () => {
  assert.equal(checkSubtaskLimits(10, 3), undefined);
});

test("checkSubtaskLimits: too many subtasks at one level - returns error naming the max", () => {
  assert.equal(checkSubtaskLimits(11, 1), "Too many subtasks at one level (max 10)");
});

test("checkSubtaskLimits: depth exceeds max - returns error naming the max", () => {
  assert.equal(checkSubtaskLimits(1, 4), "Subtask nesting exceeds max depth of 3");
});
