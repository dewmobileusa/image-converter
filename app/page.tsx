import ImageProcessor from "@/components/ImageProcessor";

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="container mx-auto max-w-[900px]">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">
          Image Converter
        </h1>
        <ImageProcessor />
      </div>
    </main>
  );
}
