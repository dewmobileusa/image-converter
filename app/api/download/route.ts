import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();
    console.log('Server: Attempting to download image from:', imageUrl);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Received empty image data');
    }
    
    const buffer = Buffer.from(arrayBuffer);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="processed-image-${Date.now()}.png"`,
        'Content-Length': buffer.length.toString(),
        'Content-Transfer-Encoding': 'binary',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Server: Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new NextResponse(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 