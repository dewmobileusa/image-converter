import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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
  if (!mode) return `comfyui-image-${formatTimestamp()}.jpg`;
  return `comfyui-${mode
    .toLowerCase()
    .replace(/([A-Z])/g, "-$1") // Add hyphens before capital letters
    .replace(/\s+/g, "-")}-${formatTimestamp()}.jpg`;
};

const downloadImage = async (
  imageUrl: string,
  mode: string | null
): Promise<void> => {
  try {
    // First try: direct download
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = formatFilename(mode);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (firstError) {
    console.error("First download attempt failed:", firstError);
    // Second try: fetch and create blob URL
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = formatFilename(mode);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (secondError) {
      console.error("Second download attempt failed:", secondError);
      // If both methods fail, open in new window
      window.open(imageUrl, "_blank");
      throw secondError;
    }
  }
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

  // Move handleSaveImage inside the component to access activeMode
  const handleSaveImage = async (imageUrl: string) => {
    const isWeChatBrowser = /MicroMessenger/i.test(navigator.userAgent);
    const isWeComBrowser = /wxwork/i.test(navigator.userAgent);
    const isInAppBrowser = isWeChatBrowser || isWeComBrowser;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    try {
      if (isIOS) {
        // For WeChat/WeCom, open in new window
        if (isInAppBrowser) {
          window.open(imageUrl, "_blank");
          toast.info("Save Image", {
            description: "Tap and hold the image to save it to your Photos",
            duration: 5000,
          });
          return;
        }

        // For Safari on iOS
        if (isSafari) {
          // Direct link to image
          window.location.href = imageUrl;
          toast.info("Save Image", {
            description: "Tap and hold the image to save it to your Photos",
            duration: 5000,
          });
          return;
        }

        // For other iOS browsers
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);

          // Create temporary link and click it
          const link = document.createElement("a");
          link.href = url;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          toast.info("Save Image", {
            description: "Tap and hold the image to save it to your Photos",
            duration: 5000,
          });
        } catch (error) {
          console.error("iOS save failed:", error);
          // Fallback to direct window location
          window.location.href = imageUrl;
          toast.info("Save Image", {
            description: "Tap and hold the image to save it to your Photos",
            duration: 5000,
          });
        }
      } else {
        // Non-iOS devices use standard download
        const filename = formatFilename(activeMode);
        await downloadImage(imageUrl, activeMode);
        toast.success("Image ready to save", {
          description: `Saved as: ${filename}`,
        });
      }
    } catch (error) {
      console.error("Failed to save image:", error);
      let errorDescription = "Please try opening the link in Safari";
      if (isWeChatBrowser || isWeComBrowser) {
        errorDescription =
          "Please tap and hold the image to save, or open in Safari";
      }
      toast.error("Failed to save image", {
        description: errorDescription,
      });
    }
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      console.log("Client: Starting download for:", imageUrl);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      // Determine if it's a RunningHub image
      const isRunningHubImage =
        imageUrl.includes("runninghub") || imageUrl.includes("rh-images");

      // Common fetch logic for all platforms
      const fetchImage = async () => {
        if (isRunningHubImage) {
          // Use our server endpoint to handle CORS and authentication
          const response = await fetch("/api/download", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ imageUrl }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Failed to download image");
          }

          return response;
        } else {
          // Direct fetch only for local/B&W images
          return await fetch(imageUrl);
        }
      };

      if (isIOS) {
        try {
          const response = await fetchImage();
          if (!response.ok) throw new Error("Failed to fetch image");
          const blob = await response.blob();
          if (!blob || blob.size === 0) {
            throw new Error("Received empty image");
          }

          const filename = formatFilename(activeMode);

          // Try to use the native share API for iOS
          if (navigator.share) {
            const file = new File([blob], filename, {
              type: "image/png",
            });

            await navigator.share({
              files: [file],
              title: "Save Image",
            });

            toast.success("Image ready to save", {
              description: `Saved as: ${filename}`,
            });
          } else {
            // Fallback for older iOS versions
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success("Image downloaded", {
              description: `Saved as: ${filename}`,
            });
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            toast.info("Save cancelled");
          } else {
            console.error("iOS save failed:", error);
            throw new Error("Failed to prepare image for saving");
          }
        }
        return;
      }

      if (isAndroid) {
        // Update Android to use the same fetch logic
        const response = await fetchImage();
        if (!response.ok) throw new Error("Failed to fetch image");
        const blob = await response.blob();
        if (!blob || blob.size === 0) {
          throw new Error("Received empty image");
        }

        // For Android, continue with download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = formatFilename(activeMode);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      }

      // Desktop/Laptop flow
      const response = await fetchImage();

      if (!response.ok) {
        let errorMessage = "Download failed";
        const responseData = await response.text();
        try {
          const errorData = JSON.parse(responseData);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = responseData || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Received empty file");
      }

      const filename = formatFilename(activeMode);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("Client: Download completed");
      toast.success("Image downloaded successfully", {
        description: `Saved as: ${filename}`,
      });
    } catch (error) {
      console.error("Client: Download failed:", error);
      toast.error("Failed to save image", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  // Add touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent default zoom/enlargement behavior on iOS
    e.preventDefault();
  };

  // Add context menu handler for iOS
  const handleLongPress = (imageUrl: string) => {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      handleDownload(imageUrl);
    }
  };

  if (isProcessing) {
    return (
      <div
        className="flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 space-y-4"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <p className="text-base">Processing image, please wait...</p>
          <p className="text-base text-gray-400">
            AI generation takes 1 to 2 minutes
          </p>
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
        className="flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 text-center"
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
        {/* Image container with touch handlers */}
        <div
          className="relative w-full h-full"
          onTouchStart={handleTouchStart}
          onContextMenu={(e) => {
            e.preventDefault();
            handleLongPress(images[currentIndex]);
          }}
          style={{ WebkitTouchCallout: "none" }} // Prevent iOS context menu
        >
          <Image
            src={images[currentIndex]}
            alt="Processed"
            fill
            className="object-contain pointer-events-none select-none"
            sizes={`${dimensions.width}px`}
            priority
            unoptimized={/iPad|iPhone|iPod/.test(navigator.userAgent)} // Prevent iOS image optimization
          />
        </div>

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
        onClick={() => handleSaveImage(images[currentIndex])}
        disabled={isProcessing}
        variant="secondary"
        className="absolute bottom-4 right-4"
      >
        Save to Photos
      </Button>
    </div>
  );
}
