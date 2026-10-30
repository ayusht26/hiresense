import { extractText as unpdfExtractText } from "unpdf";
import mammoth from "mammoth";

/**
 * Universal text extraction helper for resumes (PDF, DOCX, TXT, MD).
 * Works across client (Vite/browser) and server runtimes.
 */
export async function extractTextFromDocument(
  arrayBuffer: ArrayBuffer,
  fileName: string,
): Promise<string> {
  const lowerName = fileName.toLowerCase();

  try {
    // 1. PDF File
    if (lowerName.endsWith(".pdf")) {
      const uint8 = new Uint8Array(arrayBuffer);
      const result = await unpdfExtractText(uint8);
      if (Array.isArray(result.text)) {
        return result.text.join("\n\n").trim();
      }
      return String(result.text || "").trim();
    }

    // 2. DOCX File
    if (lowerName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    }

    // 3. Plain Text / Markdown / Other Text Files
    const decoder = new TextDecoder("utf-8");
    const raw = decoder.decode(arrayBuffer);
    // Remove binary control chars if any
    return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  } catch (error: any) {
    console.error(`Document text extraction error for ${fileName}:`, error);
    throw new Error(
      `Could not extract text from "${fileName}". Please ensure the file is not password-protected, or copy & paste your resume text directly into the "Paste text / Edit" tab.`,
    );
  }
}

/**
 * Heuristically detect candidate name and email from extracted resume text.
 */
export function extractContactInfo(resumeText: string): { name?: string; email?: string } {
  const result: { name?: string; email?: string } = {};

  if (!resumeText) return result;

  // Extract Email
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const emailMatch = resumeText.match(emailRegex);
  if (emailMatch && emailMatch[1]) {
    result.email = emailMatch[1].trim();
  }

  // Extract Name (typically on first 1-3 lines, before contact numbers or emails)
  const lines = resumeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines.slice(0, 5)) {
    // Skip headers like "CURRICULUM VITAE", "RESUME", contact lines, URLs
    const lower = line.toLowerCase();
    if (
      lower.includes("curriculum vitae") ||
      lower.includes("resume") ||
      lower.includes("@") ||
      lower.includes("http") ||
      lower.includes("github.com") ||
      lower.includes("linkedin.com") ||
      lower.includes("phone:") ||
      lower.includes("+91") ||
      lower.includes("+1") ||
      line.length > 50 ||
      line.length < 3
    ) {
      continue;
    }

    // Name usually has 2-4 capitalized words
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && /^[a-zA-Z\s.'-]+$/.test(line)) {
      result.name = line;
      break;
    }
  }

  return result;
}
