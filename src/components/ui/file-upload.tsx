"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconUpload, IconFileText, IconX } from "@tabler/icons-react";
import { useDropzone, type DropzoneOptions } from "react-dropzone";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 14,
    y: -14,
    opacity: 0.95,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export interface FileUploadProps {
  onChange?: (files: File[]) => void;
  onFileRemove?: (file: File) => void;
  accept?: DropzoneOptions["accept"];
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  files?: File[];
  title?: string;
  description?: string;
}

export const FileUpload = ({
  onChange,
  onFileRemove,
  accept,
  maxSize = 10 * 1024 * 1024, // 10 MB default
  multiple = false,
  disabled = false,
  className,
  files: controlledFiles,
  title = "Upload resume",
  description = "Drag or drop your files here or click to browse",
}: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>(controlledFiles || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (controlledFiles !== undefined) {
      setFiles(controlledFiles);
    }
  }, [controlledFiles]);

  const handleFileChange = (newFiles: File[]) => {
    if (!newFiles.length) return;
    const updated = multiple ? [...files, ...newFiles] : [newFiles[0]];
    setFiles(updated);
    onChange && onChange(updated);
  };

  const handleRemove = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const removedFile = files[index];
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (onFileRemove && removedFile) onFileRemove(removedFile);
    onChange && onChange(updated);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple,
    noClick: true,
    accept,
    maxSize,
    disabled,
    onDrop: handleFileChange,
    onDropRejected: (rejected) => {
      console.warn("File drop rejected:", rejected);
    },
  });

  return (
    <div className={cn("w-full", className)} {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover={disabled ? undefined : "animate"}
        className={cn(
          "p-8 sm:p-10 group/file block rounded-[24px] cursor-pointer w-full relative overflow-hidden transition-colors border",
          isDragActive
            ? "border-[#f5f5f5] bg-[#141414]"
            : "border-[rgba(255,255,255,0.10)] bg-[#141414] hover:border-[rgba(255,255,255,0.20)]",
          disabled && "opacity-60 cursor-not-allowed hover:border-[rgba(255,255,255,0.10)]",
        )}
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          disabled={disabled}
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />

        {/* Ambient Grid Pattern with radial mask */}
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none opacity-50">
          <GridPattern />
        </div>

        <div className="flex flex-col items-center justify-center relative z-20 text-center">
          <p className="font-sans text-[18px] sm:text-[20px] font-[650] text-[#f5f5f5] tracking-tight">
            {title}
          </p>
          <p className="font-sans text-[13px] sm:text-[14px] font-[450] text-[#8a8a8a] mt-1.5 max-w-md">
            {description}
          </p>

          <div className="relative w-full mt-8 max-w-xl mx-auto">
            <AnimatePresence>
              {files.length > 0 &&
                files.map((file, idx) => (
                  <motion.div
                    key={"file" + idx + file.name}
                    layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "relative overflow-hidden z-40 bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] flex flex-col items-start justify-start p-4 mt-3 w-full mx-auto rounded-[16px] transition-colors",
                    )}
                  >
                    <div className="flex justify-between w-full items-center gap-3">
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[30%] bg-[#262626] text-[#f5f5f5] shrink-0">
                          <IconFileText className="h-4 w-4 text-[#f5f5f5]" />
                        </div>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                          className="text-[14px] font-[600] text-[#f5f5f5] truncate max-w-xs text-left"
                        >
                          {file.name}
                        </motion.p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                          className="rounded-full px-2.5 py-1 text-[11px] font-mono font-[600] bg-[#262626] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)] tabular-nums"
                        >
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </motion.span>

                        <button
                          type="button"
                          onClick={(e) => handleRemove(e, idx)}
                          className="h-7 w-7 rounded-full bg-[#262626] text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-[#333333] transition-colors flex items-center justify-center"
                          title="Remove file"
                        >
                          <IconX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex text-[11px] font-mono items-center w-full mt-2.5 justify-between text-[#707070] pt-2 border-t border-[rgba(255,255,255,0.04)]">
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        layout
                        className="px-2 py-0.5 rounded-full bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.04)]"
                      >
                        {file.type || file.name.split(".").pop()?.toUpperCase() || "DOCUMENT"}
                      </motion.span>

                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                        modified {new Date(file.lastModified).toLocaleDateString()}
                      </motion.span>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>

            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative group-hover/file:border-[rgba(255,255,255,0.3)] z-40 bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] flex items-center justify-center h-28 mt-4 w-full max-w-[8.5rem] mx-auto rounded-[16px] transition-all",
                )}
              >
                {isDragActive ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[#f5f5f5] flex flex-col items-center gap-1.5"
                  >
                    <IconUpload className="h-5 w-5 text-[#f5f5f5]" />
                    <span className="text-[12px] font-[600]">Drop it</span>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-[#8a8a8a] group-hover/file:text-[#f5f5f5] transition-colors">
                    <IconUpload className="h-5 w-5 text-[#f5f5f5]" />
                    <span className="text-[12px] font-[600]">Upload</span>
                  </div>
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute opacity-0 border border-dashed border-[#f5f5f5]/30 inset-0 z-30 bg-transparent flex items-center justify-center h-28 mt-4 w-full max-w-[8.5rem] mx-auto rounded-[16px]"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex bg-[#0f0f0f] flex-shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px scale-105 pointer-events-none">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={cn(
                "w-10 h-10 flex flex-shrink-0 rounded-[2px]",
                index % 2 === 0
                  ? "bg-[#141414]"
                  : "bg-[#121212] shadow-[0px_0px_1px_1px_rgba(255,255,255,0.03)_inset]",
              )}
            />
          );
        }),
      )}
    </div>
  );
}

export default FileUpload;
