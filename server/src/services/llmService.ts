// Gemini LLM integration: builds a dynamic skill-classification prompt and parses the model's response into skill names.
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../prismaClient.js";

async function buildSystemPrompt(): Promise<string> {
  const skills = await prisma.skill.findMany({ orderBy: { name: "asc" } });
  const skillList = skills.map((s) => `- ${s.name}`).join("\n");

  return `You are a skill classifier for software development tasks.
Given a task title, identify which development skills are required.

Available skills:
${skillList}

Return ONLY a JSON array of skill names. Examples:
- "As a visitor, I want to see a responsive homepage" -> ["Frontend"]
- "As a system administrator, I want audit logs" -> ["Backend"]
- "As a user, I want to update my profile and upload a picture" -> ["Frontend", "Backend"]

If unsure, include all skills from the list above that could apply. Return ONLY the JSON array, no other text.`;
}

const MAX_RETRIES = 2;

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWithRetry(fn: () => Promise<string>): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 500);
      }
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Gemini API call failed after ${MAX_RETRIES + 1} attempt(s): ${message}`);
}

function tryParseSkillArray(candidate: string): string[] | null {
  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // fall through
  }
  return null;
}

export function parseSkillNames(text: string): string[] {
  const cleaned = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();

  const direct = tryParseSkillArray(cleaned);
  if (direct) return direct;

  // Response may have wrapped the array in prose instead of returning it raw — try to
  // recover the array substring before giving up. Still not a call failure either way.
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    const extracted = tryParseSkillArray(match[0]);
    if (extracted) return extracted;
  }

  return [];
}

export async function identifySkills(taskTitle: string): Promise<string[]> {
  const model = getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  });

  const systemPrompt = await buildSystemPrompt();

  const text = await callWithRetry(async () => {
    const result = await model.generateContent(
      `${systemPrompt}\n\nTask title: "${taskTitle}"`
    );
    return result.response.text();
  });

  return parseSkillNames(text);
}
