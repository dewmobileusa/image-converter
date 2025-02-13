"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Plus } from "lucide-react";
import Image from "next/image";

interface ImageUploaderProps {
  onImageUpload: (imageData: string) => void;
  currentImage: string | null;
  dimensions: { width: number; height: number };
}

export default function ImageUploader({
  onImageUpload,
  currentImage,
  dimensions,
}: ImageUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            onImageUpload(e.target.result as string);
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
    <div className="relative flex-shrink-0" style={{ width: dimensions.width }}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg
          flex items-center justify-center
          cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/10" : "border-gray-300"}
        `}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <input {...getInputProps()} />
        {currentImage ? (
          <div className="relative w-full h-full group">
            <Image
              src={currentImage}
              alt="Uploaded"
              fill
              className="object-contain"
              sizes={`${dimensions.width}px`}
              priority
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-base text-white">Click or drag to replace</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Plus className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-base text-gray-500">
              {isDragActive
                ? "Drop the image here"
                : "Click to upload or drag and drop"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
