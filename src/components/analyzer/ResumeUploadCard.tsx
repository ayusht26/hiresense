import { useState } from "react";
import {
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { extractTextFromDocument } from "@/lib/document-parser";

export interface ResumeUploadData {
  candidateName: string;
  candidateEmail: string;
  preferredLanguage: "en" | "hi" | "code_mixed";
  resumeText: string;
  resumeBase64?: string;
  fileName: string;
}

interface ResumeUploadCardProps {
  onAnalyze: (data: ResumeUploadData) => void;
  isLoading: boolean;
  jobTitle: string;
  companyName: string;
  candidateName?: string;
  candidateEmail?: string;
}

export function ResumeUploadCard({
  onAnalyze,
  isLoading,
  jobTitle,
  companyName,
  candidateName = "",
  candidateEmail = "",
}: ResumeUploadCardProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "text">("upload");
  const [resumeText, setResumeText] = useState("");
  const [resumeBase64, setResumeBase64] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setFileError(null);
    setExtractionSuccess(null);
    if (!file) return;

    const validExtensions = [".pdf", ".docx", ".txt", ".md"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (
      !validExtensions.includes(ext) &&
      !file.type.includes("pdf") &&
      !file.type.includes("text")
    ) {
      setFileError("Please upload a PDF, DOCX, or TXT document.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError("File size exceeds 10MB limit.");
      return;
    }

    try {
      setIsExtracting(true);
      setUploadedFile(file);
      setUploadedFileName(file.name);

      const arrayBuffer = await file.arrayBuffer();

      // Convert array buffer to base64
      let binary = "";
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);
      setResumeBase64(b64);

      // Extract real text from the document (PDF, DOCX, TXT)
      const extractedText = await extractTextFromDocument(arrayBuffer, file.name);

      if (!extractedText || extractedText.trim().length < 20) {
        throw new Error(
          "No readable text could be extracted from this document. It might be scanned as an image. Please paste your resume text in the 'Paste text / Edit' tab.",
        );
      }

      setResumeText(extractedText);

      setExtractionSuccess(
        `Extracted ${extractedText.length.toLocaleString()} characters from "${file.name}"`,
      );
    } catch (err: unknown) {
      console.error("Resume file extraction failure:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to parse document text. Please paste your resume text.";
      setFileError(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setUploadedFileName(null);
    setResumeText("");
    setResumeBase64("");
    setExtractionSuccess(null);
    setFileError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = resumeText.trim();

    if (!finalContent || finalContent.length < 30) {
      setFileError(
        "Please upload a resume file with readable text or paste your resume content in the 'Paste text / Edit' tab.",
      );
      return;
    }

    onAnalyze({
      candidateName: candidateName.trim() || "Candidate",
      candidateEmail: candidateEmail.trim(),
      preferredLanguage: "en",
      resumeText: finalContent,
      resumeBase64: resumeBase64 || undefined,
      fileName: uploadedFileName || "pasted-resume.txt",
    });
  };

  return (
    <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-8 space-y-6">
      {/* Top Banner & Title */}
      <div className="border-b border-[rgba(255,255,255,0.08)] pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[11px] font-[600] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)]">
            Stage 2 · Screening & Analysis
          </span>
        </div>
        <h2 className="text-[24px] sm:text-[28px] font-[650] tracking-tight text-[#f5f5f5]">
          Submit resume for analysis.
        </h2>
        <p className="mt-1 text-[14px] font-[450] text-[#8a8a8a]">
          Our AI engine extracts skills and computes an evidence-backed compatibility score
          against <span className="text-[#f5f5f5] font-[600]">{jobTitle}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Input Mode Tabs: Upload Document vs Paste Text */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-[#1a1a1a] p-1 rounded-full border border-[rgba(255,255,255,0.06)]">
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`h-8 px-4 rounded-full text-[12px] font-[600] transition-colors ${
                  activeTab === "upload"
                    ? "bg-[#f5f5f5] text-[#0a0a0a]"
                    : "text-[#8a8a8a] hover:text-[#f5f5f5]"
                }`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                className={`h-8 px-4 rounded-full text-[12px] font-[600] transition-colors ${
                  activeTab === "text"
                    ? "bg-[#f5f5f5] text-[#0a0a0a]"
                    : "text-[#8a8a8a] hover:text-[#f5f5f5]"
                }`}
              >
                Paste text / Edit (
                {resumeText ? `${resumeText.length.toLocaleString()} chars` : "empty"})
              </button>
            </div>

            {uploadedFileName && (
              <span className="text-[12px] text-[#8a8a8a] flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1 rounded-full border border-[rgba(255,255,255,0.06)]">
                <FileText size={13} className="text-[#f5f5f5]" />
                <span className="font-[600] text-[#f5f5f5] truncate max-w-[200px]">
                  {uploadedFileName}
                </span>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="hover:text-red-400 ml-1.5 text-[#707070]"
                  title="Remove file"
                >
                  <X size={13} />
                </button>
              </span>
            )}
          </div>

          {/* Extraction status banner */}
          {isExtracting && (
            <div className="rounded-[16px] bg-[#1a1a1a] p-4 text-center border border-[rgba(255,255,255,0.10)] flex items-center justify-center gap-2.5 text-[13px] text-[#f5f5f5]">
              <Loader2 size={16} className="animate-spin text-[#60a5fa]" />
              <span>Reading and extracting text from {uploadedFileName}...</span>
            </div>
          )}

          {extractionSuccess && !isExtracting && (
            <div className="rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 flex items-center justify-between gap-2 text-[12px] text-emerald-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{extractionSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                className="underline hover:text-emerald-300 text-[11px] font-[600] shrink-0"
              >
                View extracted text
              </button>
            </div>
          )}

          {activeTab === "upload" ? (
            <div className="pt-1">
              <FileUpload
                onChange={(files) => {
                  if (files.length > 0) {
                    handleFile(files[0]);
                  }
                }}
                onFileRemove={() => handleClearFile()}
                files={uploadedFile ? [uploadedFile] : []}
                accept={{
                  "application/pdf": [".pdf"],
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
                    ".docx",
                  ],
                  "text/plain": [".txt", ".md"],
                }}
                disabled={isExtracting}
                title="Upload resume document"
                description="Drag or drop your PDF, DOCX, or TXT resume here or click to browse"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <textarea
                rows={9}
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                }}
                placeholder="Paste the text of your resume here (Summary, Skills, Work Experience, Education, Projects)..."
                className="w-full p-4 rounded-[16px] bg-[#1a1a1a] border-0 text-[13px] font-mono leading-relaxed text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              />
              <div className="flex items-center justify-between text-[11px] text-[#707070]">
                <span>The AI evaluates this exact text against {jobTitle} criteria.</span>
                <span>{resumeText.length.toLocaleString()} characters</span>
              </div>
            </div>
          )}

          {fileError && (
            <div className="rounded-[14px] bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-2 text-[13px] text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{fileError}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
          <p className="text-[12px] text-[#707070] max-w-sm">
            Resume content is evaluated strictly against role criteria. No personal traits or
            protected characteristics are used in scoring.
          </p>

          <button
            type="submit"
            disabled={isLoading || isExtracting}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f5f5f5] px-7 text-[14px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#0a0a0a]" />
                <span>Analyzing resume...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Analyze resume & check fit</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
