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
  label?: string;
}

// Add a helper function to format time
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}"`;
};

// Update helper function to format timestamp
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

// Update helper function to format filename
const formatFilename = (mode: string | null): string => {
  if (!mode) return `processed-image-${formatTimestamp()}.jpg`;
  return `processed-${mode
    .toLowerCase()
    .replace(/([A-Z])/g, "-$1") // Add hyphens before capital letters
    .replace(/\s+/g, "-")}-${formatTimestamp()}.jpg`;
};

const downloadImage = async (
  imageUrl: string,
  mode: string | null
): Promise<void> => {
  const filename = formatFilename(mode);
  console.log("Downloading with filename:", filename);

  // Extract file extension from original URL
  const extension = imageUrl.split(".").pop()?.toLowerCase() || "png";
  const finalFilename = filename.replace(".jpg", `.${extension}`);
  console.log("Final filename:", finalFilename);

  try {
    // Use our API endpoint to handle the download
    const response = await fetch("/api/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl,
        filename: finalFilename,
      }),
    });

    if (!response.ok) throw new Error("Download failed");

    // Create blob from response
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement("a");
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download failed:", error);
    // Fallback: open in new window with filename hint
    window.open(imageUrl, "_blank");
    toast.info("Save Image", {
      description: `Right-click and 'Save As' with filename: ${finalFilename}`,
      duration: 5000,
    });
  }
};

export default function ProcessedImage({
  images,
  dimensions,
  isProcessing,
  activeMode,
  label,
}: ProcessedImageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);

  // Reset currentIndex when images change
  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

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
      const filename = formatFilename(activeMode);

      if (isInAppBrowser) {
        // For WeChat/WeCom: open in new window with instructions
        window.open(imageUrl, "_blank");
        toast.info("Save Image", {
          description: `Long press to save as: ${filename}`,
          duration: 5000,
        });
        return;
      }

      if (isIOS && isSafari) {
        // For iOS Safari: use blob URL with instructions
        const response = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl, filename }),
        });

        if (!response.ok) throw new Error("Download failed");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        toast.info("Save Image", {
          description: `Long press to save as: ${filename}`,
          duration: 5000,
        });

        window.location.href = url;
        return;
      }

      // For all other platforms (Desktop, Android, etc.)
      await downloadImage(imageUrl, activeMode);
      toast.success("Image ready to save", {
        description: `Saved as: ${filename}`,
      });
    } catch (error) {
      console.error("Failed to save image:", error);
      let errorDescription = "Please try opening the link in Safari";
      if (isInAppBrowser) {
        errorDescription =
          "Please tap and hold the image to save, or open in Safari";
      }
      toast.error("Failed to save image", {
        description: errorDescription,
      });
    }
  };

  // Check processing state first
  if (isProcessing) {
    return (
      <div className="space-y-2">
        {label && <p className="text-sm text-gray-500 text-center">{label}</p>}
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
      </div>
    );
  }

  // Then check for empty images
  if (!images || images.length === 0) {
    return (
      <div className="space-y-2">
        {label && <p className="text-sm text-gray-500 text-center">{label}</p>}
        <div
          className="flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 text-center"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          <p className="text-base">Processed image will appear here</p>
        </div>
      </div>
    );
  }

  // Finally render the processed image(s)
  return (
    <div className="space-y-2 relative">
      {label && <p className="text-sm text-gray-500 text-center">{label}</p>}
      <div
        className="relative border-2 border-gray-300 rounded-lg overflow-hidden"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {images.length > 0 ? (
          <>
            <Image
              src={images[currentIndex]}
              alt="Processed"
              fill
              className="object-contain"
              sizes={`${dimensions.width}px`}
              priority
              crossOrigin="anonymous"
            />

            {/* Navigation arrows for multiple images */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentIndex((prev) =>
                      prev === 0 ? images.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  onClick={() =>
                    setCurrentIndex((prev) =>
                      prev === images.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="Next image"
                >
                  →
                </button>
                {/* Image counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded-full text-sm">
                  {currentIndex + 1} / {images.length}
                </div>
              </>
            )}

            {/* Save button - moved inside the image container */}
            <div className="absolute bottom-4 right-4 z-10">
              <Button
                onClick={() => handleSaveImage(images[currentIndex])}
                disabled={isProcessing}
                variant="secondary"
                className="bg-black/50 hover:bg-black/70 text-white"
              >
                {/iPad|iPhone|iPod|Android/.test(navigator.userAgent)
                  ? "Save to Photos"
                  : "Save Image"}
              </Button>
            </div>
          </>
        ) : isProcessing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Processing...</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Processed image will appear here
          </div>
        )}
      </div>
    </div>
  );
}
