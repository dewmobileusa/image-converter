import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();
    console.log('Server: Attempting to download image from:', imageUrl);
    
    const response = await fetch(imageUrl, {
      headers: {
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const headers = new Headers();
    headers.set("Content-Type", "image/png");
    headers.set("Content-Disposition", "attachment");

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Server: Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to download image';
    
    return new NextResponse(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 