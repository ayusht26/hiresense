import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { StructuredJobListing } from "@/types/database.types";

// Rate-limiting tracker (sliding window in memory)
const requestLogs = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const timestamps = requestLogs.get(identifier) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLogs.set(identifier, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  requestLogs.set(identifier, validTimestamps);
  return false;
}

// Zod input validator
export const GenerateListingInputSchema = z.object({
  title: z.string().trim().min(2, "Job title must be at least 2 characters").max(200),
  company: z.string().trim().min(1, "Company name is required").max(200),
  description: z
    .string()
    .trim()
    .min(10, "Job description must be at least 10 characters")
    .max(20000),
  salary: z.string().trim().max(200).optional().default(""),
});

export type GenerateListingInput = z.infer<typeof GenerateListingInputSchema>;

export type GenerateListingResult = {
  structured: StructuredJobListing;
  model_name: string;
  prompt_version: string;
};

/**
 * Core AI structuring logic that contacts the Python microservice or runs Python CLI.
 */
export async function executeAiStructuring(
  data: GenerateListingInput,
): Promise<GenerateListingResult> {
  const clientId = "recruiter_client";
  if (isRateLimited(clientId)) {
    throw new Error(
      "Rate limit exceeded. Maximum 10 generation requests per minute. Please wait a moment before trying again.",
    );
  }

  const { title, company, description, salary } = data;
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

  // 1. Strategy A: Call Python FastAPI service if running
  try {
    const response = await fetch(`${aiServiceUrl}/api/generate-job-listing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        company,
        description,
        salary: salary || undefined,
      }),
      signal: AbortSignal.timeout(35000),
    });

    if (response.ok) {
      const result = (await response.json()) as GenerateListingResult;
      return result;
    }
  } catch {
    // FastAPI microservice not running on port 8000, seamlessly try CLI execution
  }

  // 2. Strategy B: Execute Python AI CLI via child process
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);

    const workspaceRoot = process.cwd();
    const pythonArgs = [
      "-m",
      "AI.cli",
      "--title",
      title,
      "--company",
      company,
      "--desc",
      description,
      "--salary",
      salary || "",
    ];

    const { stdout, stderr } = await execFileAsync("python", pythonArgs, {
      cwd: workspaceRoot,
      timeout: 40000,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    if (!stdout && stderr) {
      console.error("AI CLI stderr:", stderr);
    }

    const parsed = JSON.parse(stdout.trim()) as GenerateListingResult;
    return parsed;
  } catch (cliError: any) {
    console.error("Python AI CLI execution error:", cliError);
    throw new Error(
      `Failed to structure job listing: ${
        cliError?.message || "AI structuring engine timed out or encountered an error."
      }`,
    );
  }
}

/**
 * Server function to generate structured job listing using the HireSense AI Engine.
 * Executes strictly server-side:
 * 1. Checks in-memory sliding window rate limits
 * 2. Attempts to contact Python FastAPI service at http://127.0.0.1:8000
 * 3. Falls back to executing Python CLI (python -m AI.cli)
 * 4. Ensures OpenAI / Gemini keys are never leaked to client
 */
export const generateJobListingServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => GenerateListingInputSchema.parse(data))
  .handler(async ({ data }): Promise<GenerateListingResult> => {
    return executeAiStructuring(data);
  });
