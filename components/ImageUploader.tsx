"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface ImageUploaderProps {
  onImageUpload: (imageData: string, fileName?: string) => void;
  currentImage: string | null;
  dimensions: { width: number; height: number };
  label?: string;
}

const HumanSilhouette = () => (
  <svg
    viewBox="0 0 100 120"
    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 stroke-gray-200
      w-[60%] h-[60%] 
      max-w-[280px] max-h-[320px] 
      min-w-[180px] min-h-[220px]
      sm:w-[65%] sm:h-[65%]
      md:w-[70%] md:h-[70%]
      lg:w-[75%] lg:h-[75%]
      xl:w-[80%] xl:h-[80%]
      2xl:max-w-[400px] 2xl:max-h-[460px]"
    fill="none"
    strokeWidth="2"
    strokeDasharray="4 4"
  >
    {/* Head */}
    <circle cx="50" cy="30" r="15" />
    {/* Shoulders and Torso */}
    <path d="M30 50 Q50 45 70 50" />
    <path d="M30 50 L30 90" />
    <path d="M70 50 L70 90" />
    <path d="M30 90 Q50 85 70 90" />
  </svg>
);

export default function ImageUploader({
  onImageUpload,
  currentImage,
  dimensions,
  label,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        try {
          setIsUploading(true);
          console.log("Starting image upload process...", file.name);

          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Data = e.target?.result as string;
            console.log("Image converted to base64, sending to API...");

            const response = await fetch("/api/runninghub", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "upload",
                imageData: base64Data,
              }),
            });

            if (!response.ok) {
              throw new Error("Upload failed");
            }

            const data = await response.json();
            console.log("Upload response received:", data);

            if (data.success) {
              console.log(
                "Image upload successful, fileName:",
                data.imageFileName
              );
              onImageUpload(base64Data, data.imageFileName);
            } else {
              throw new Error(data.error || "Upload failed");
            }
          };

          reader.readAsDataURL(file);
        } catch (error) {
          console.error("Image upload error:", error);
          toast.error("Failed to upload image");
        } finally {
          setIsUploading(false);
        }
      }
    },
    [onImageUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    multiple: false,
  });

  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-gray-500 text-center">{label}</p>}
      <div
        className={`relative flex-shrink-0 border-2 ${
          isDragActive ? "border-primary" : "border-gray-300"
        } border-dashed rounded-lg overflow-hidden`}
        style={{ width: dimensions.width, height: dimensions.height }}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        {currentImage ? (
          <>
            <Image
              src={currentImage}
              alt="Source"
              fill
              className="object-contain"
              sizes={`${dimensions.width}px`}
              priority
            />
            <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white p-2 text-center text-sm">
              Click or drag to replace
            </div>
          </>
        ) : isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-center p-4">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-base">Uploading...</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-center p-4">
            <HumanSilhouette />
            <Plus className="w-12 h-12 text-gray-400 relative z-10 mb-2" />
            <p className="text-base relative z-10">Click or drag image here</p>
            <p className="text-sm text-gray-400 mt-2 relative z-10">
              Supports: JPG, PNG
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
