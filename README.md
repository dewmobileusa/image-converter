# AI Image Converter

A modern web application for image processing and style transfer, built with Next.js 15.1.6. This tool allows users to apply various effects to their images using the RunningHub API.

## Features

- **Multiple Image Effects:**
  - Black & White (with adjustable contrast)
  - Cartoon Blind Box
  - Cartoon Portrait
  - Anime Character
  - Dreamlike Oil Painting
  - ID Photo
  - Easy Lighting

- **User Interface:**
  - Drag-and-drop image upload
  - Visual preview for each effect
  - Real-time processing status with timer
  - Multi-image result navigation
  - One-click image download
  - Responsive design

- **Technical Features:**
  - Client-side image processing for B&W effect
  - API integration with RunningHub
  - Efficient image caching
  - Progress tracking
  - Custom file naming with timestamps

## Getting Started

1. Clone the repository
```bash
git clone [repository-url]
cd image-converter
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env.local` file in the root directory:
```bash
NEXT_PUBLIC_RUNNINGHUB_API_KEY=your_api_key_here
```

4. Run the development server
```bash
npm run dev
```

## RunningHub API Integration

The application integrates with RunningHub API for various image effects. Here are the workflow configurations:

- Easy Lighting
  - Workflow ID: 1889119863665844226
  - Node ID: 22

- Cartoon Blind Box
  - Workflow ID: 1887752924372860930
  - Node ID: 132

- Cartoon Portrait
  - Workflow ID: 1889592477429522434
  - Node ID: 226

- Anime Character
  - Workflow ID: 1889855846065614850
  - Node ID: 40

- Dreamlike Oil Painting
  - Workflow ID: 1889903634522550273
  - Node ID: 40

- ID Photo
  - Workflow ID: 1834120666105933826
  - Node ID: 14

## Technology Stack

- Next.js 15.1.6
- React 19.0.0
- TypeScript
- Tailwind CSS
- Radix UI Components
- React Dropzone

## Project Structure

```
image-converter/
├── app/
│   ├── api/
│   │   └── download/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ImageProcessor.tsx
│   ├── ImageUploader.tsx
│   └── ProcessedImage.tsx
├── services/
│   └── runningHubApi.ts
└── public/
    └── previews/
```

## Features in Detail

### Image Upload
- Supports drag-and-drop
- Accepts common image formats (PNG, JPG, JPEG, GIF)
- Preview of uploaded image
- Replace functionality

### Image Processing
- Real-time processing status
- Timer display in MM:SS format
- Prevents multiple simultaneous processing
- Automatic error handling

### Image Download
- Custom filename format: processed-[effect-name]-[timestamp].png
- Timestamp format: YYYYMMDDHHMMSS
- Automatic file type handling
- Error handling for failed downloads

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Add your license information here]