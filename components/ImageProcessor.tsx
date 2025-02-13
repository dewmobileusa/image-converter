"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import ImageUploader from "./ImageUploader";
import ProcessedImage from "./ProcessedImage";
import { Home } from "lucide-react";
import { runningHubApi } from "@/services/runningHubApi";
import Image from "next/image";

// Add type for effect ID at the top of the file
type EffectId =
  | "blackAndWhite"
  | "easyLighting"
  | "cartoonBlindBox"
  | "cartoonPortrait"
  | "animeCharacter"
  | "dreamlikeOil"
  | "idPhoto";

export default function ImageProcessor() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [showBWSlider, setShowBWSlider] = useState(false);
  const [contrastLevel, setContrastLevel] = useState([0.5]); // 0-1 range
  const [activeMode, setActiveMode] = useState<
    | "blackAndWhite"
    | "easyLighting"
    | "cartoonBlindBox"
    | "cartoonPortrait"
    | "animeCharacter"
    | "dreamlikeOil"
    | "idPhoto"
    | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Add state for window dimensions
  const [dimensions, setDimensions] = useState({
    width: 400,
    height: 512,
  });

  // Add new state for uploaded image URI
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);

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

  const handleImageUpload = (imageData: string) => {
    setSourceImage(imageData);
    setProcessedImages([]);
    setShowBWSlider(false);
    setActiveMode(null);
  };

  const handleClear = () => {
    setSourceImage(null);
    setProcessedImages([]);
    setShowBWSlider(false);
    setActiveMode(null);
    setUploadedImageUri(null); // Clear the uploaded image URI
  };

  const processBlackAndWhite = async (contrast: number) => {
    if (!sourceImage) return;

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

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert to black and white with adjustable contrast
        for (let i = 0; i < data.length; i += 4) {
          // Calculate grayscale value using luminance formula
          const gray =
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

          // Apply contrast adjustment
          const factor = (259 * (contrast * 2 - 1) + 255) / 255;
          const adjustedGray = factor * (gray - 128) + 128;

          // Ensure values stay within 0-255 range
          const value = Math.min(255, Math.max(0, adjustedGray));

          data[i] = value; // R
          data[i + 1] = value; // G
          data[i + 2] = value; // B
          // data[i + 3] is Alpha, we don't need to change it
        }

        ctx.putImageData(imageData, 0, 0);
        setProcessedImages([canvas.toDataURL("image/png")]);
        resolve(null);
      };
    });
  };

  const processAnimate = async (
    mode:
      | "easyLighting"
      | "cartoonBlindBox"
      | "cartoonPortrait"
      | "animeCharacter"
      | "dreamlikeOil"
      | "idPhoto"
  ) => {
    if (!sourceImage) return;
    setIsProcessing(true);

    try {
      console.log(`Starting ${mode} process...`);

      // Only upload if we don't have a URI yet
      let imageFileName = uploadedImageUri;
      if (!imageFileName) {
        console.log("Uploading image for the first time...");
        imageFileName = await runningHubApi.uploadImage(sourceImage);
        setUploadedImageUri(imageFileName); // Remember the URI
        console.log("Upload successful, fileName:", imageFileName);
      } else {
        console.log("Reusing previously uploaded image:", imageFileName);
      }

      // Create task with mode
      const taskId = await runningHubApi.createTask(imageFileName, mode);
      console.log("Task created successfully, taskId:", taskId);

      // Poll for status
      let attempts = 0;
      const maxAttempts = 300; // 10 minutes maximum wait time (2 seconds * 300 = 600 seconds = 10 minutes)

      while (attempts < maxAttempts) {
        const status = await runningHubApi.checkStatus(taskId);
        console.log("Current status:", status);

        if (status === "SUCCESS") {
          const outputUrls = await runningHubApi.getOutputs(taskId);
          console.log("Process completed, output URLs:", outputUrls);
          setProcessedImages(outputUrls);
          break;
        } else if (status === "FAILED") {
          throw new Error("Image processing failed");
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (attempts >= maxAttempts) {
        throw new Error("Image process timed out");
      }
    } catch (error) {
      console.error(`${mode} processing failed:`, error);
      alert(`Failed to process image: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processImage = async (
    operation:
      | "blackAndWhite"
      | "easyLighting"
      | "cartoonBlindBox"
      | "cartoonPortrait"
      | "animeCharacter"
      | "dreamlikeOil"
      | "idPhoto"
  ) => {
    if (!sourceImage) return;

    setActiveMode(operation);
    setProcessedImages([]);

    switch (operation) {
      case "blackAndWhite":
        setShowBWSlider(true);
        await processBlackAndWhite(contrastLevel[0]);
        break;

      case "easyLighting":
        setShowBWSlider(false);
        await processAnimate("easyLighting");
        break;

      case "cartoonBlindBox":
        setShowBWSlider(false);
        await processAnimate("cartoonBlindBox");
        break;

      case "cartoonPortrait":
        setShowBWSlider(false);
        await processAnimate("cartoonPortrait");
        break;

      case "animeCharacter":
        setShowBWSlider(false);
        await processAnimate("animeCharacter");
        break;

      case "dreamlikeOil":
        setShowBWSlider(false);
        await processAnimate("dreamlikeOil");
        break;

      case "idPhoto":
        setShowBWSlider(false);
        await processAnimate("idPhoto");
        break;
    }
  };

  return (
    <div className="container mx-auto px-4 space-y-4">
      {sourceImage && (
        <Button variant="outline" onClick={handleClear} className="mb-2">
          <Home className="w-4 h-4 mr-2" />
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
                processBlackAndWhite(value[0]);
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
              onClick={() => processImage(effect.id as EffectId)}
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
    </div>
  );
}
