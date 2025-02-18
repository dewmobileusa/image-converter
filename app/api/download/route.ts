import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageUrl, filename } = await request.json();
    console.log("Server: Downloading image:", { imageUrl, filename });

    const response = await fetch(imageUrl);
    const blob = await response.blob();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Server: Download failed:", error);
    return NextResponse.json(
      { error: "Failed to download image" },
      { status: 500 }
    );
  }
} 