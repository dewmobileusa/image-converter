"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Plus, Loader2 } from "lucide-react";
import Image from "next/image";

interface ImageUploaderProps {
  onImageUpload: (imageData: string) => void;
  currentImage: string | null;
  dimensions: { width: number; height: number };
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
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            onImageUpload(e.target.result as string);
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
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
  );
}
