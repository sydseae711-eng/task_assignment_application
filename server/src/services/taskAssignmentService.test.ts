// Unit tests for taskAssignmentService.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMissingSkillIds } from "./taskAssignmentService.js";

test("computeMissingSkillIds: developer has all required skills", () => {
  assert.deepEqual(computeMissingSkillIds([1, 2], [1, 2, 3]), []);
});

test("computeMissingSkillIds: developer missing one required skill", () => {
  assert.deepEqual(computeMissingSkillIds([1, 2], [1]), [2]);
});

test("computeMissingSkillIds: task requires no skills - always valid", () => {
  assert.deepEqual(computeMissingSkillIds([], [1]), []);
  assert.deepEqual(computeMissingSkillIds([], []), []);
});

test("computeMissingSkillIds: developer has extra unrelated skills - still valid", () => {
  assert.deepEqual(computeMissingSkillIds([1], [1, 2, 3, 4]), []);
});

test("computeMissingSkillIds: multiple missing skills are all reported", () => {
  assert.deepEqual(computeMissingSkillIds([1, 2, 3], []), [1, 2, 3]);
});
