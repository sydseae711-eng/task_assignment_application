// Unit tests for subtaskValidation.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hasBlankSubtaskTitle } from "./subtaskValidation.ts";
import type { SubtaskInput } from "../types/index.ts";

function makeSubtask(overrides: Partial<SubtaskInput> = {}): SubtaskInput {
  return { clientId: "x", title: "Valid title", skillIds: [], subtasks: [], ...overrides };
}

test("hasBlankSubtaskTitle: empty list - false", () => {
  assert.equal(hasBlankSubtaskTitle([]), false);
});

test("hasBlankSubtaskTitle: blank title at the root level - true", () => {
  assert.equal(hasBlankSubtaskTitle([makeSubtask({ title: "   " })]), true);
});

test("hasBlankSubtaskTitle: blank title only in a nested subtask - true", () => {
  const tree = [makeSubtask({ title: "Parent", subtasks: [makeSubtask({ title: "" })] })];
  assert.equal(hasBlankSubtaskTitle(tree), true);
});
