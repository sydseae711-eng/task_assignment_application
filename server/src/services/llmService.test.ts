// Unit tests for llmService.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSkillNames } from "./llmService.js";

test("parseSkillNames: parses a clean single-skill JSON array", () => {
  assert.deepEqual(parseSkillNames('["Frontend"]'), ["Frontend"]);
});

test("parseSkillNames: parses a multi-skill JSON array", () => {
  assert.deepEqual(parseSkillNames('["Frontend", "Backend"]'), ["Frontend", "Backend"]);
});

test("parseSkillNames: strips markdown code fences", () => {
  assert.deepEqual(parseSkillNames('```json\n["Backend"]\n```'), ["Backend"]);
});

test("parseSkillNames: recovers a JSON array wrapped in prose", () => {
  assert.deepEqual(parseSkillNames('Sure, here you go: ["Frontend"]'), ["Frontend"]);
});

test("parseSkillNames: returns empty array when no array is present at all", () => {
  assert.deepEqual(parseSkillNames("I cannot classify this task."), []);
});

test("parseSkillNames: filters out non-string elements", () => {
  assert.deepEqual(parseSkillNames('["Frontend", 123, "Backend"]'), ["Frontend", "Backend"]);
});
