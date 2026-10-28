"use client";

import { Upload, X, AlertCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface FileUploadProps {
  onFileSelect?: (file: File | null) => void;
  onUpload?: (file: File, helpers: { onProgress: (pct: number) => void }) => Promise<void>;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  circularPreview?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  value?: File | null;
}

const DEFAULT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export function FileUpload({
  onFileSelect,
  onUpload,
  acceptedFileTypes = DEFAULT_IMAGE_TYPES,
  maxFileSize = DEFAULT_MAX_SIZE,
  circularPreview = true,
  disabled = false,
  error: controlledError,
  className,
  value,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(value ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();

  const activeError = controlledError || internalError;

  useEffect(() => {
    if (value !== undefined) {
      setFile(value);
    }
  }, [value]);

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const validateFile = useCallback(
    (chosen: File): string | null => {
      // Check type
      const isTypeAllowed = acceptedFileTypes.some((type) => {
        if (type.startsWith(".")) {
          return chosen.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.endsWith("/*")) {
          return chosen.type.toLowerCase().startsWith(type.slice(0, -1).toLowerCase());
        }
        return chosen.type.toLowerCase() === type.toLowerCase();
      });

      if (!isTypeAllowed) {
        if (acceptedFileTypes.includes("application/pdf")) {
          return "Please upload a PDF or DOCX document.";
        }
        return "Use a JPG, PNG or WebP image.";
      }

      // Check size
      if (chosen.size > maxFileSize) {
        const mb = Math.round(maxFileSize / (1024 * 1024));
        return `That file is too large. Max ${mb} MB.`;
      }

      return null;
    },
    [acceptedFileTypes, maxFileSize],
  );

  const handleSelected = useCallback(
    (newFile: File | null) => {
      if (!newFile) {
        setFile(null);
        setInternalError(null);
        onFileSelect?.(null);
        return;
      }

      const err = validateFile(newFile);
      if (err) {
        setInternalError(err);
        return;
      }

      setInternalError(null);
      setFile(newFile);
      onFileSelect?.(newFile);
    },
    [onFileSelect, validateFile],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0] ?? null;
    handleSelected(chosen);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    const dropped = e.dataTransfer.files?.[0] ?? null;
    handleSelected(dropped);
  };

  const handleRemove = () => {
    setFile(null);
    setPreviewUrl(null);
    setInternalError(null);
    setProgress(0);
    onFileSelect?.(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div
      className={cn(
        "w-full rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#141414] p-6 text-center transition-all",
        disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        id={baseId}
        accept={acceptedFileTypes.join(",")}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {file && previewUrl && circularPreview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="flex flex-col items-center gap-4 py-2"
          >
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full border-2 border-[#f5f5f5] bg-[#1a1a1a] bg-cover bg-center overflow-hidden"
                style={{ backgroundImage: `url(${previewUrl})` }}
              />
            </div>

            <div className="text-center">
              <p className="text-[14px] font-[600] text-[#f5f5f5] truncate max-w-[260px]">
                {file.name}
              </p>
              <p className="text-[12px] text-[#8a8a8a] tabular-nums mt-0.5">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>

            {isUploading ? (
              <div className="w-full max-w-[200px] space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-[#1a1a1a] overflow-hidden">
                  <div
                    className="h-full bg-[#f5f5f5] transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[12px] text-[#8a8a8a] tabular-nums">
                  {Math.round(progress)}% uploading...
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.15)] bg-[#1a1a1a] px-3.5 py-1.5 text-[13px] font-[600] text-[#f5f5f5] transition-colors hover:bg-[#262626]"
              >
                <X size={14} />
                <span>Remove photo</span>
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled && !isUploading) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (!disabled && !isUploading) inputRef.current?.click();
            }}
            className={cn(
              "group flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed p-8 cursor-pointer transition-colors",
              isDragging
                ? "border-[#f5f5f5] bg-[#1a1a1a]"
                : "border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.30)] hover:bg-[#1a1a1a]/50",
              disabled &&
                "cursor-not-allowed hover:border-[rgba(255,255,255,0.15)] hover:bg-transparent",
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.10)] text-[#f5f5f5] mb-3 group-hover:scale-105 transition-transform">
              <Upload size={20} />
            </div>

            <p className="text-[14px] font-[600] text-[#f5f5f5]">
              <span>Drop an image here or </span>
              <span className="underline underline-offset-4 decoration-[#5c5c5c] group-hover:decoration-[#f5f5f5]">
                browse
              </span>
            </p>

            <p className="text-[12px] text-[#8a8a8a] mt-1.5">JPG, PNG or WebP · Up to 2 MB</p>
          </motion.div>
        )}
      </AnimatePresence>

      {activeError && (
        <p
          role="alert"
          aria-live="polite"
          className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#f5f5f5]"
        >
          <AlertCircle size={14} className="shrink-0" />
          <span>{activeError}</span>
        </p>
      )}
    </div>
  );
}

export default FileUpload;
