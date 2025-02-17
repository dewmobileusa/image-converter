"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import ImageUploader from "./ImageUploader";
import ProcessedImage from "./ProcessedImage";
import { RotateCcw } from "lucide-react";
import { runningHubApi } from "@/services/runningHubApi";
import Image from "next/image";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";

// Update the EffectId type to only include RunningHub effects
type EffectId =
  | "easyLighting"
  | "cartoonBlindBox"
  | "cartoonPortrait"
  | "animeCharacter"
  | "dreamlikeOil"
  | "idPhoto";

// Add a type for all modes including blackAndWhite
type ImageMode = EffectId | "blackAndWhite";

export default function ImageProcessor() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [showBWSlider, setShowBWSlider] = useState(false);
  const [contrastLevel, setContrastLevel] = useState([0.5]); // 0-1 range
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Add state for window dimensions
  const [dimensions, setDimensions] = useState({
    width: 400,
    height: 512,
  });

  // Add new state for uploaded URL
  const [uploadedRunningHubUrl, setUploadedRunningHubUrl] = useState<
    string | null
  >(null);

  // Define clearAll first
  const clearAll = useCallback(async () => {
    if (isProcessing && currentTaskId) {
      try {
        await runningHubApi.cancelTask(currentTaskId);
        toast.success("Processing cancelled");
      } catch (error) {
        console.error("Failed to cancel task:", error);
      }
    }

    // Reset all states
    setSourceImage(null);
    setProcessedImages([]);
    setShowBWSlider(false);
    setActiveMode(null);
    setUploadedRunningHubUrl(null);
    setIsProcessing(false);
    setCurrentTaskId(null);
    setShowClearConfirm(false);
  }, [isProcessing, currentTaskId]);

  // Then use it in handleClear
  const handleClear = useCallback(() => {
    if (isProcessing && currentTaskId) {
      setShowClearConfirm(true);
    } else {
      // If no task is running, clear immediately
      clearAll();
    }
  }, [isProcessing, currentTaskId, clearAll]);

  // Handle window resize
  useEffect(() => {
    function updateDimensions() {
      // Calculate width to fit two boxes side by side with gap
      // Window width - padding - gap between boxes
      const availableWidth = window.innerWidth - 32 - 16; // 32px for container padding, 16px for gap
      const containerWidth = Math.min(availableWidth / 2, 400); // Each box takes half the space, max 400px

      setDimensions({
        width: containerWidth,
        height: containerWidth, // Keep it square
      });
    }

    // Set initial dimensions
    updateDimensions();

    // Add event listener
    window.addEventListener("resize", updateDimensions);

    // Cleanup
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Image upload should clear the previous uploaded URL
  const handleImageUpload = useCallback((imageData: string) => {
    setSourceImage(imageData);
    setProcessedImages([]);
    setShowBWSlider(false);
    setActiveMode(null);
    setUploadedRunningHubUrl(null);
  }, []);

  const processImage = useCallback(
    async (mode: ImageMode) => {
      if (!sourceImage) return;

      try {
        setIsProcessing(true);
        setActiveMode(mode);

        // Hide B&W slider when switching to other effects
        if (mode !== "blackAndWhite") {
          setShowBWSlider(false);
        }

        if (mode === "blackAndWhite") {
          setShowBWSlider(true);
          const processAndApplyBW = async (contrast: number) => {
            const img = new window.Image();
            img.src = sourceImage;

            await new Promise((resolve) => {
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");

                if (!ctx) return;

                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );
                const data = imageData.data;

                // Convert to black and white with adjustable contrast
                for (let i = 0; i < data.length; i += 4) {
                  const gray =
                    0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                  const factor = (259 * (contrast * 2 - 1) + 255) / 255;
                  const adjustedGray = factor * (gray - 128) + 128;
                  const value = Math.min(255, Math.max(0, adjustedGray));

                  data[i] = value; // R
                  data[i + 1] = value; // G
                  data[i + 2] = value; // B
                }

                ctx.putImageData(imageData, 0, 0);
                setProcessedImages([canvas.toDataURL("image/png")]);
                resolve(null);
              };
            });
          };
          await processAndApplyBW(contrastLevel[0]);
        } else {
          let imageFileName = uploadedRunningHubUrl;

          if (!imageFileName) {
            imageFileName = await runningHubApi.uploadImage(sourceImage);
            setUploadedRunningHubUrl(imageFileName);
          }

          const taskId = await runningHubApi.createTask(imageFileName, mode);
          setCurrentTaskId(taskId);

          try {
            // Poll for status
            let attempts = 0;
            const maxAttempts = 300; // 10 minutes maximum

            while (attempts < maxAttempts) {
              const status = await runningHubApi.checkStatus(taskId);
              console.log("Current status:", status);

              if (status === "SUCCESS") {
                const outputUrls = await runningHubApi.getOutputs(taskId);
                setProcessedImages(outputUrls);
                break;
              }

              if (status === "FAILED") {
                throw new Error("Processing failed");
              }

              if (status === "PROCESSING") {
                // Still processing, continue polling
                attempts++;
                await new Promise((resolve) => setTimeout(resolve, 2000));
                continue;
              }

              attempts++;
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            if (attempts >= maxAttempts) {
              throw new Error("Processing timed out");
            }
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "TASK_QUEUE_MAXED"
            ) {
              toast.error("System is busy", {
                description:
                  "Please wait a moment and try again. Too many requests are being processed.",
                duration: 5000,
              });
              return;
            }
            throw error; // Re-throw other errors
          }
        }
      } catch (error) {
        console.error("Processing failed:", error);
        toast.error("Processing failed", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsProcessing(false);
        setCurrentTaskId(null);
      }
    },
    [sourceImage, uploadedRunningHubUrl, contrastLevel]
  );

  return (
    <div className="container mx-auto px-4 space-y-4">
      {sourceImage && (
        <Button variant="outline" onClick={handleClear} className="mb-2">
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      )}

      <div className="flex flex-row gap-4 justify-center items-start">
        <ImageUploader
          onImageUpload={handleImageUpload}
          currentImage={sourceImage}
          dimensions={dimensions}
        />
        <ProcessedImage
          images={processedImages}
          dimensions={dimensions}
          isProcessing={isProcessing}
          activeMode={activeMode}
        />
      </div>

      <div className="flex flex-col items-center">
        {showBWSlider && (
          <div className="w-full max-w-[300px] space-y-2">
            <label className="text-sm text-gray-500">
              Contrast Level: {Math.round(contrastLevel[0] * 100)}%
            </label>
            <Slider
              value={contrastLevel}
              onValueChange={(value) => {
                setContrastLevel(value);
                processImage("blackAndWhite");
              }}
              min={0}
              max={1}
              step={0.01}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-4 justify-center mt-4">
          {[
            {
              id: "blackAndWhite",
              label: "Black & White",
              preview: "/previews/preview-bw.jpg",
            },
            {
              id: "cartoonBlindBox",
              label: "Cartoon Blind Box",
              preview: "/previews/preview-cartoon-box.jpg",
            },
            {
              id: "cartoonPortrait",
              label: "Cartoon Portrait",
              preview: "/previews/preview-cartoon-portrait.jpg",
            },
            {
              id: "animeCharacter",
              label: "Anime Character",
              preview: "/previews/preview-anime.jpg",
            },
            {
              id: "dreamlikeOil",
              label: "Dreamlike Oil Painting",
              preview: "/previews/preview-oil.jpg",
            },
            {
              id: "idPhoto",
              label: "ID Photo",
              preview: "/previews/preview-id.jpg",
            },
            {
              id: "easyLighting",
              label: "Easy Lighting",
              preview: "/previews/preview-lighting.jpg",
            },
          ].map((effect) => (
            <Button
              key={effect.id}
              onClick={() => processImage(effect.id as ImageMode)}
              disabled={!sourceImage || isProcessing}
              className={`relative w-32 h-32 p-0 overflow-hidden ${
                activeMode === effect.id
                  ? "ring-2 ring-primary ring-offset-2"
                  : ""
              }`}
            >
              <Image
                src={effect.preview}
                alt={effect.label}
                fill
                className="object-cover"
                sizes="128px"
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                <p className="text-xs text-white text-center leading-tight">
                  {effect.label}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={clearAll}
        title="Cancel Processing"
        description="Are you sure you want to cancel the current processing task? This action cannot be undone."
      />
    </div>
  );
}
