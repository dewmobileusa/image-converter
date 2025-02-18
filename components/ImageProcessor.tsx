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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Single image effects
type SingleImageEffectId =
  | "easyLighting"
  | "cartoonBlindBox"
  | "cartoonPortrait"
  | "animeCharacter"
  | "dreamlikeOil"
  | "idPhoto";

// Dual image effects
type DualImageEffectId = "clothTryOn"; // Will add more dual image effects here

// Combined type for all modes
type ImageMode = SingleImageEffectId | DualImageEffectId | "blackAndWhite";

// Define effect lists separately
const singleImageEffects = [
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
] as const;

const dualImageEffects = [
  {
    id: "clothTryOn",
    label: "Cloth Try-On",
    preview: "/previews/preview-cloth-try-on.jpg",
  },
] as const;

export default function ImageProcessor() {
  // Single image states
  const [singleSourceImage, setSingleSourceImage] = useState<string | null>(
    null
  );
  const [singleProcessedImages, setSingleProcessedImages] = useState<string[]>(
    []
  );

  // Dual image states
  const [dualSourceImage, setDualSourceImage] = useState<string | null>(null);
  const [dualTargetImage, setDualTargetImage] = useState<string | null>(null);
  const [dualProcessedImages, setDualProcessedImages] = useState<string[]>([]);

  // Shared states
  const [showBWSlider, setShowBWSlider] = useState(false);
  const [contrastLevel, setContrastLevel] = useState([0.5]);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [uploadedRunningHubUrl, setUploadedRunningHubUrl] = useState<
    string | null
  >(null);

  // Add state for window dimensions
  const [dimensions, setDimensions] = useState({
    width: 400,
    height: 512,
  });

  // Single image handlers
  const handleSingleImageUpload = useCallback(
    (imageData: string, fileName?: string) => {
      setSingleSourceImage(imageData);
      if (fileName) {
        setUploadedRunningHubUrl(fileName);
        console.log("Setting uploaded file name:", fileName);
      }
    },
    []
  );

  // Dual image handlers
  const handleDualSourceImageUpload = useCallback((imageData: string) => {
    setDualSourceImage(imageData);
    setDualProcessedImages([]);
    setActiveMode(null);
  }, []);

  const handleDualTargetImageUpload = useCallback((imageData: string) => {
    setDualTargetImage(imageData);
    setDualProcessedImages([]);
    setActiveMode(null);
  }, []);

  // Update clear function to handle both modes
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
    setSingleSourceImage(null);
    setSingleProcessedImages([]);
    setDualSourceImage(null);
    setDualTargetImage(null);
    setDualProcessedImages([]);
    setShowBWSlider(false);
    setActiveMode(null);
    setUploadedRunningHubUrl(null);
    setIsProcessing(false);
    setCurrentTaskId(null);
    setShowClearConfirm(false);
  }, [isProcessing, currentTaskId]);

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

  const processImage = useCallback(
    async (mode: ImageMode) => {
      const sourceImage = singleSourceImage || dualSourceImage;
      if (!sourceImage) return;

      if (mode === "clothTryOn") {
        if (!dualSourceImage || !dualTargetImage) return;
      }

      try {
        setIsProcessing(true);
        setActiveMode(mode);

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
                setSingleProcessedImages([canvas.toDataURL("image/png")]);
                setDualProcessedImages([canvas.toDataURL("image/png")]);
                resolve(null);
              };
            });
          };
          await processAndApplyBW(contrastLevel[0]);
        } else if (mode === "clothTryOn") {
          // Cloth try-on logic will be added later
          toast.info("Cloth try-on feature coming soon!");
        } else {
          // At this point, mode must be SingleImageEffectId
          let imageFileName = uploadedRunningHubUrl;

          if (!imageFileName) {
            imageFileName = await runningHubApi.uploadImage(sourceImage);
            setUploadedRunningHubUrl(imageFileName);
          }

          // Now we can safely cast mode as SingleImageEffectId
          const taskId = await runningHubApi.createTask(
            imageFileName,
            mode as SingleImageEffectId
          );
          setCurrentTaskId(taskId);

          try {
            let attempts = 0;
            const maxAttempts = 300;

            while (attempts < maxAttempts) {
              const status = await runningHubApi.checkStatus(taskId);
              console.log("Current status:", status);

              if (status === "SUCCESS") {
                const outputUrls = await runningHubApi.getOutputs(taskId);
                setSingleProcessedImages(outputUrls);
                break;
              }

              if (status === "FAILED") {
                throw new Error("Processing failed");
              }

              if (status === "PROCESSING") {
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
            throw error;
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
    [
      singleSourceImage,
      dualSourceImage,
      dualTargetImage,
      uploadedRunningHubUrl,
      contrastLevel,
    ]
  );

  const handleEffectClick = async (mode: string) => {
    try {
      console.log("Creating task for mode:", mode);
      console.log("Using image file name:", uploadedRunningHubUrl);

      if (!uploadedRunningHubUrl) {
        toast.error("Please upload an image first");
        return;
      }

      const response = await fetch("/api/runninghub", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          mode,
          imageFileName: uploadedRunningHubUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Task creation failed:", errorData);
        throw new Error(errorData.error || "Failed to create task");
      }

      const data = await response.json();
      console.log("Task creation successful:", data);
      setCurrentTaskId(data.taskId);
      setIsProcessing(true);
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  // Poll for status and get results
  useEffect(() => {
    if (!currentTaskId || !isProcessing) return;

    const checkStatus = async () => {
      try {
        const response = await fetch("/api/runninghub", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "checkStatus",
            taskId: currentTaskId,
          }),
        });

        const data = await response.json();
        console.log("Status check response:", data);

        if (data.status === "SUCCESS") {
          setIsProcessing(false);
          // Get the processed image URL
          const outputResponse = await fetch("/api/runninghub", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "getOutputs",
              taskId: currentTaskId,
            }),
          });

          const outputData = await outputResponse.json();
          if (outputData.success && outputData.outputUrls.length > 0) {
            // Ensure URLs are properly formatted
            const formattedUrls = outputData.outputUrls.map((url: string) => {
              // Handle CORS and protocol issues
              if (url.startsWith("//")) {
                return `https:${url}`;
              }
              return url;
            });

            setSingleProcessedImages(formattedUrls);
            console.log("Updated processed images:", formattedUrls);
          }
        } else if (data.status === "FAILED") {
          setIsProcessing(false);
          toast.error("Processing failed");
        }
      } catch (error) {
        console.error("Status check error:", error);
        setIsProcessing(false);
        toast.error("Failed to check processing status");
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [currentTaskId, isProcessing]);

  return (
    <div className="container mx-auto px-4 space-y-4">
      {singleSourceImage && (
        <Button variant="outline" onClick={clearAll} className="mb-2">
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      )}

      <Tabs defaultValue="single-image" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single-image">Single Image</TabsTrigger>
          <TabsTrigger value="dual-image">Dual Image</TabsTrigger>
        </TabsList>

        <TabsContent value="single-image">
          <div className="flex flex-row gap-4 justify-center items-start">
            <ImageUploader
              onImageUpload={handleSingleImageUpload}
              currentImage={singleSourceImage}
              dimensions={dimensions}
              label="Source Image"
            />
            <ProcessedImage
              images={singleProcessedImages}
              dimensions={dimensions}
              isProcessing={isProcessing}
              activeMode={activeMode}
              label="Processed Image"
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
              {singleImageEffects.map((effect) => (
                <Button
                  key={effect.id}
                  onClick={() => handleEffectClick(effect.id)}
                  disabled={!singleSourceImage || isProcessing}
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
        </TabsContent>

        <TabsContent value="dual-image">
          <div className="flex flex-row gap-4 justify-center items-start">
            <div className="flex flex-col gap-4">
              <ImageUploader
                onImageUpload={handleDualSourceImageUpload}
                currentImage={dualSourceImage}
                dimensions={{
                  width: dimensions.width * 0.8,
                  height: dimensions.height * 0.8,
                }}
                label="Source Image"
              />
              <ImageUploader
                onImageUpload={handleDualTargetImageUpload}
                currentImage={dualTargetImage}
                dimensions={{
                  width: dimensions.width * 0.8,
                  height: dimensions.height * 0.8,
                }}
                label="Target Image"
              />
            </div>
            <ProcessedImage
              images={dualProcessedImages}
              dimensions={dimensions}
              isProcessing={isProcessing}
              activeMode={activeMode}
              label="Processed Image"
            />
          </div>

          <div className="flex justify-center mt-4">
            {dualImageEffects.map((effect) => (
              <Button
                key={effect.id}
                onClick={() => processImage(effect.id as ImageMode)}
                disabled={!dualSourceImage || !dualTargetImage || isProcessing}
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
        </TabsContent>
      </Tabs>

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
