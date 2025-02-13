import { Button } from "./ui/button";
import { Download, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

interface ProcessedImageProps {
  images: string[];
  dimensions: { width: number; height: number };
  isProcessing: boolean;
  activeMode: string | null;
}

// Add a helper function to format time
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}"`;
};

// Add helper function to format timestamp
const formatTimestamp = (): string => {
  const now = new Date();
  return (
    now.getFullYear() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0") +
    now.getHours().toString().padStart(2, "0") +
    now.getMinutes().toString().padStart(2, "0") +
    now.getSeconds().toString().padStart(2, "0")
  );
};

// Add helper function to format filename
const formatFilename = (mode: string | null): string => {
  if (!mode) return `processed-image-${formatTimestamp()}.png`;
  return `processed-${mode
    .toLowerCase()
    .replace(/\s+/g, "-")}-${formatTimestamp()}.png`;
};

export default function ProcessedImage({
  images,
  dimensions,
  isProcessing,
  activeMode,
}: ProcessedImageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);

  // Timer for processing state
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isProcessing) {
      setProcessingTime(0);
      timer = setInterval(() => {
        setProcessingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isProcessing]);

  const handleDownload = async (imageUrl: string) => {
    try {
      console.log("Client: Starting download for:", imageUrl);

      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      // Try to parse error response if not OK
      if (!response.ok) {
        let errorMessage = "Download failed";
        const responseData = await response.text();
        try {
          const errorData = JSON.parse(responseData);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the raw text
          errorMessage = responseData || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Create a link and click it
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Received empty file");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = formatFilename(activeMode);
      link.style.display = "none"; // Hide the link

      // Force the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("Client: Download completed");
    } catch (error) {
      console.error("Client: Download failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to download image: ${errorMessage}`);
    }
  };

  if (isProcessing) {
    return (
      <div
        className="flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 space-y-4"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-base">Processing image...</p>
          <p className="text-base text-gray-400">
            {formatTime(processingTime)}
          </p>
        </div>
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div
        className="flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <p className="text-base">Processed image will appear here</p>
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0" style={{ width: dimensions.width }}>
      <div
        className="relative border-2 border-gray-300 rounded-lg overflow-hidden"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {/* Image */}
        <Image
          src={images[currentIndex]}
          alt="Processed"
          fill
          className="object-contain"
          sizes={`${dimensions.width}px`}
          priority
        />

        {/* Navigation arrows if more than one image */}
        {images.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
              onClick={() =>
                setCurrentIndex((prev) =>
                  prev === 0 ? images.length - 1 : prev - 1
                )
              }
            >
              ←
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
              onClick={() =>
                setCurrentIndex((prev) =>
                  prev === images.length - 1 ? 0 : prev + 1
                )
              }
            >
              →
            </button>
          </>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Download button */}
      <Button
        onClick={() => handleDownload(images[currentIndex])}
        className="absolute -top-12 right-0"
        variant="outline"
      >
        <Download className="w-4 h-4 mr-2" />
        Save Image
      </Button>
    </div>
  );
}
