import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerationResult, UploadedFile, LocationType, GeneratedImage, GeolocationCoordinates, BlueprintData } from '../types';

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_API_KEY environment variable not set. Please set it in .env file.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Model names
const NANO_BANANA_MODEL = 'gemini-2.5-flash-image-preview'; // Nano Banana image generation model
const ANALYSIS_MODEL = 'gemini-2.5-flash'; // Gemini 2.5 Flash for text and image analysis

// A list of MIME types supported by the image generation model.
const SUPPORTED_IMAGE_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif'
];

/**
 * Removes the data URL prefix from a base64 string.
 */
const cleanBase64 = (base64String: string): string => {
    return base64String.split(',')[1] || base64String;
};

/**
 * Converts uploaded files to format expected by Gemini
 */
function filesToParts(files: UploadedFile[]) {
    return files.map(file => ({
        inlineData: {
            data: cleanBase64(file.base64),
            mimeType: file.mimeType
        }
    }));
}

/**
 * Process and clean up images using Nano Banana to remove UI elements
 */
async function cleanUpImages(
  files: UploadedFile[],
  onProgress: (message: string) => void
): Promise<UploadedFile[]> {
    onProgress("Cleaning up input images...");
    
    const imageFiles = files.filter(file => SUPPORTED_IMAGE_MIME_TYPES.includes(file.mimeType));
    const otherFiles = files.filter(file => !SUPPORTED_IMAGE_MIME_TYPES.includes(file.mimeType));

    if (imageFiles.length === 0) {
        return files;
    }

    try {
        // Use Nano Banana to clean up screenshots and remove UI elements
        const cleanModel = genAI.getGenerativeModel({ 
            model: NANO_BANANA_MODEL,
            generationConfig: {
                temperature: 0.3, // Lower temperature for more consistent cleaning
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });

        const cleanedImages: UploadedFile[] = [];

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            onProgress(`Cleaning image ${i + 1} of ${imageFiles.length}...`);

            try {
                const cleanupPrompt = `You are an image cleanup specialist. Analyze this image and generate a CLEAN version.

IMPORTANT CLEANUP TASKS:
1. If this is a screenshot, remove ALL UI elements including:
   - Navigation bars, buttons, menus
   - Cursor, selection boxes, tooltips
   - Watermarks, logos, overlays
   - Any text overlays or annotations
   - Browser chrome or app interface elements

2. If this is a virtual tour or 360° image, remove:
   - Navigation arrows or controls
   - Virtual tour UI elements
   - Info bubbles or hotspots
   - Company branding or watermarks

3. Enhance the venue visibility by:
   - Improving lighting if needed
   - Removing any obstructions
   - Keeping architectural features clear
   - Maintaining true colors and proportions

Generate a CLEAN, PROFESSIONAL image of just the venue space itself, suitable for event planning visualization.
The output should look like a professional architectural photograph without any digital artifacts.`;

                const parts = [
                    { text: cleanupPrompt },
                    {
                        inlineData: {
                            data: cleanBase64(file.base64),
                            mimeType: file.mimeType
                        }
                    }
                ];

                const result = await cleanModel.generateContent(parts);
                const response = await result.response;
                
                // Check if we got a cleaned image back
                let cleanedFile = file; // Default to original if cleaning fails
                
                const candidates = response.candidates;
                if (candidates && candidates.length > 0) {
                    const content = candidates[0].content;
                    
                    if (content && content.parts) {
                        for (const part of content.parts) {
                            if (part.inlineData && part.inlineData.data) {
                                // Got a cleaned image
                                const cleanedImageData = part.inlineData.data;
                                const mimeType = part.inlineData.mimeType || file.mimeType;
                                
                                cleanedFile = {
                                    ...file,
                                    base64: `data:${mimeType};base64,${cleanedImageData}`,
                                    name: `cleaned_${file.name}`
                                };
                                console.log(`Successfully cleaned image: ${file.name}`);
                                break;
                            }
                        }
                    }
                }
                
                cleanedImages.push(cleanedFile);
                
            } catch (error) {
                console.error(`Error cleaning image ${file.name}:`, error);
                // If cleaning fails, use the original image
                cleanedImages.push(file);
            }
        }

        onProgress("Image cleanup complete!");
        return [...cleanedImages, ...otherFiles];
        
    } catch (error) {
        console.error("Error in image cleanup process:", error);
        // If the whole cleanup process fails, return original files
        return files;
    }
}

/**
 * Analyzes media files and generates a blueprint for the event
 */
export async function getEventBlueprint(
  uploadedFiles: UploadedFile[],
  prompt: string,
  location: LocationType | null,
  venueWebsite: string,
  onProgress: (message: string) => void
): Promise<BlueprintData> {
    onProgress("Analyzing venue with AI...");
    
    try {
        // Clean up images first - remove UI elements from screenshots
        const cleanedFiles = await cleanUpImages(uploadedFiles, onProgress);
        
        // Use Gemini 2.5 Flash for analysis with cleaned images
        const model = genAI.getGenerativeModel({ model: ANALYSIS_MODEL });
        
        // Create comprehensive analysis prompt
        const blueprintPrompt = `
You are an expert event planner analyzing a venue for an event.

Event Request: ${prompt || 'General event planning'}
Location: ${location ? (typeof location === 'string' ? location : `Coordinates: ${location.latitude}, ${location.longitude}`) : 'Not specified'}
Venue Website: ${venueWebsite || 'Not provided'}

Based on the venue images provided, create a detailed event blueprint that includes:

1. **Venue Analysis**
   - Type of venue (ballroom, conference center, outdoor space, etc.)
   - Estimated capacity
   - Key architectural features
   - Available amenities

2. **Event Layout Design**
   - Optimal space utilization for: ${prompt}
   - Guest flow and circulation patterns
   - Key zones: entrance, main event space, service areas
   - Staging and technical setup areas

3. **Visual Transformation Plan**
   - Lighting recommendations
   - Decoration placement
   - Color scheme suggestions
   - Furniture arrangement

4. **Three Specific Views to Generate**
   - Floor Plan View: Describe the top-down layout
   - Front/Entrance View: Describe how guests will see the venue upon arrival
   - Main Event Space View: Describe the primary event area setup

Please be specific about spatial arrangements, decorative elements, and how to transform the venue for this event.
        `;

        // Prepare parts for the API call
        const parts = [
            { text: blueprintPrompt },
            ...filesToParts(cleanedFiles)
        ];

        onProgress("Creating event blueprint...");
        
        // Generate blueprint
        const result = await model.generateContent(parts);
        const response = await result.response;
        const blueprint = response.text();
        
        // Create media analysis summary
        const mediaAnalysis = `
Venue Analysis Complete:
- ${cleanedFiles.length} venue images analyzed
- Location: ${location ? (typeof location === 'string' ? location : `${location.latitude}, ${location.longitude}`) : 'Not specified'}
- Website: ${venueWebsite || 'Not provided'}
- Event Type: ${prompt}
- AI Analysis: Completed successfully using Gemini
        `.trim();
        
        return {
            blueprint,
            userFiles: uploadedFiles,     // Original files as uploaded
            foundFiles: cleanedFiles,     // Cleaned files for generation
            mediaAnalysis
        };
    } catch (error) {
        console.error("Error generating blueprint:", error);
        throw new Error("Failed to analyze venue. Please check your images and try again.");
    }
}

/**
 * Generates transformed venue images using Nano Banana model
 */
export async function generateLayoutFromBlueprint(
  blueprintData: BlueprintData,
  onProgress: (message: string) => void
): Promise<GenerationResult> {
    onProgress("Generating venue transformations with Nano Banana AI...");
    
    try {
        // Use Nano Banana (Gemini 2.5 Flash Image) model for image generation
        const imageModel = genAI.getGenerativeModel({ 
            model: NANO_BANANA_MODEL,
            generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });
        
        // Use cleaned images if available, otherwise fall back to original
        const cleanedImages = blueprintData.foundFiles.filter(file => 
            SUPPORTED_IMAGE_MIME_TYPES.includes(file.mimeType)
        );
        
        const originalImages = blueprintData.userFiles.filter(file => 
            SUPPORTED_IMAGE_MIME_TYPES.includes(file.mimeType)
        );
        
        // Prefer cleaned images for generation
        const venueImages = cleanedImages.length > 0 ? cleanedImages : originalImages;

        if (venueImages.length === 0) {
            throw new Error("No venue images found to transform");
        }
        
        console.log(`Using ${cleanedImages.length > 0 ? 'cleaned' : 'original'} images for generation (${venueImages.length} images)`)

        // Generate two views: Floor Plan and Main Event Space
        const viewPrompts = [
            {
                label: "Floor Plan",
                prompt: `You are an expert architectural renderer specializing in event floor plans.

CRITICAL INSTRUCTIONS:
1. Generate a CLEAN, PROFESSIONAL ARCHITECTURAL FLOOR PLAN - not a photo or 3D view
2. This must be a TOP-DOWN, 2D architectural drawing with NO photographic elements
3. DO NOT include any UI elements, screenshots marks, or artifacts from the source images
4. Create a proper technical drawing with clean lines, measurements, and architectural symbols

Based on the venue photos provided (which have been cleaned), create a floor plan that shows:

ARCHITECTURAL ELEMENTS (use standard symbols):
- Walls (thick black lines)
- Doors (arc symbols)
- Windows (parallel lines)
- Columns/pillars (circles or squares)
- Stairs (if present)

EVENT LAYOUT based on: ${blueprintData.blueprint}
- Tables and seating arrangements (circles/rectangles with chair symbols)
- Stage/presentation area (rectangle with label)
- Dance floor (if applicable)
- Registration/reception desk
- Catering stations
- Bar area
- Service areas
- Emergency exits (clearly marked)

STYLE REQUIREMENTS:
- Clean white background
- Black lines for structure
- Light colors for different zones
- Clear labels for each area
- Scale indicator
- North arrow
- Legend for symbols used

Generate a PROFESSIONAL ARCHITECTURAL FLOOR PLAN suitable for event planning documentation. This should look like it was created in CAD software, NOT like a photograph or screenshot.`
            },
            {
                label: "Main Event Space",
                prompt: `You are an expert event designer. Using the provided CLEANED venue photo(s), transform the MAIN EVENT SPACE for the occasion.

IMPORTANT: The images provided have been pre-cleaned to remove UI elements and artifacts. Use these clean images to visualize the transformed space.

Transform this specific venue's main space by adding:
- Complete event setup based on: ${blueprintData.blueprint}
- Appropriate seating arrangement for the space
- Stage or focal point that fits the venue
- Professional lighting design
- Decorations, drapery, and centerpieces
- Color scheme and theme elements

Generate a photorealistic image showing THIS EXACT VENUE transformed and ready for the event, maintaining its original architecture while adding all event elements.`
            },
            {
                label: "Side View",
                prompt: `You are an expert architectural renderer. Create a SIDE ELEVATION VIEW of the event setup.

Generate a clean architectural side view (cross-section) showing:
- The venue's interior height and proportions
- Stage/presentation area elevation
- Seating arrangement from the side
- Lighting and technical setup positioning
- Decorative elements placement (draping, banners, etc.)
- Clear height measurements

Based on the event requirements: ${blueprintData.blueprint}

This should be a clean architectural drawing showing the vertical arrangement of the event space, suitable for understanding sight lines and spatial relationships.`
            }
        ];

        const generatedImages: GeneratedImage[] = [];
        
        // Process each view with all venue images for context
        for (let i = 0; i < viewPrompts.length; i++) {
            const view = viewPrompts[i];
            onProgress(`Generating ${view.label} with Nano Banana...`);
            
            try {
                // Prepare the generation request with ALL venue images for better context
                const imageParts = filesToParts(venueImages);
                
                // Create the prompt with proper image context
                const fullPrompt = `${view.prompt}

Number of venue images provided: ${venueImages.length}
Image quality: ${cleanedImages.length > 0 ? 'Pre-processed and cleaned (UI elements removed)' : 'Original uploads'}
Please analyze all provided images to understand the complete venue space and generate an appropriate ${view.label.toLowerCase()}.`;
                
                // Combine text prompt with all venue images
                const parts = [
                    { text: fullPrompt },
                    ...imageParts
                ];
                
                // Generate the image using Nano Banana
                const result = await imageModel.generateContent(parts);
                const response = await result.response;
                
                // Check if the response contains generated image data
                const candidates = response.candidates;
                if (candidates && candidates.length > 0) {
                    const content = candidates[0].content;
                    
                    // Check for inline data in the response (image generation)
                    if (content && content.parts) {
                        for (const part of content.parts) {
                            if (part.inlineData && part.inlineData.data) {
                                // Found generated image data
                                const imageData = part.inlineData.data;
                                const mimeType = part.inlineData.mimeType || 'image/png';
                                
                                generatedImages.push({
                                    imageUrl: `data:${mimeType};base64,${imageData}`,
                                    description: `AI-generated ${view.label.toLowerCase()} based on your venue photos`,
                                    label: view.label
                                });
                                break;
                            }
                        }
                    }
                    
                    // If no image data found in response, might be text description
                    // Try to generate using the description
                    if (generatedImages.length === i) {
                        // No image was added, use fallback
                        console.log(`No image data in response for ${view.label}, using fallback`);
                        generatedImages.push({
                            imageUrl: generateFallbackSVG(view.label, blueprintData, i),
                            description: `${view.label} visualization (fallback)`,
                            label: view.label
                        });
                    }
                } else {
                    throw new Error("No response candidates from Nano Banana");
                }
                
            } catch (error) {
                console.error(`Error generating ${view.label}:`, error);
                // Add a fallback visualization if generation fails
                generatedImages.push({
                    imageUrl: generateFallbackSVG(view.label, blueprintData, i),
                    description: `${view.label} visualization`,
                    label: view.label
                });
            }
        }
        
        onProgress("Venue transformation complete!");
        
        return { images: generatedImages };
        
    } catch (error) {
        console.error("Error with Nano Banana image generation:", error);
        
        // Complete fallback to SVG visualizations
        return {
            images: [
                {
                    imageUrl: generateFloorPlanSVG(blueprintData),
                    description: "Floor plan layout (fallback visualization)",
                    label: "Floor Plan"
                },
                {
                    imageUrl: generateMainSpaceSVG(blueprintData),
                    description: "Main space layout (fallback visualization)",
                    label: "Main Event Space"
                },
                {
                    imageUrl: generateSideViewSVG(blueprintData),
                    description: "Side elevation view (fallback visualization)",
                    label: "Side View"
                }
            ]
        };
    }
}

/**
 * Generate appropriate fallback SVG based on view type
 */
function generateFallbackSVG(label: string, blueprintData: BlueprintData, index: number): string {
    switch(label) {
        case "Floor Plan":
            return generateFloorPlanSVG(blueprintData);
        case "Main Event Space":
            return generateMainSpaceSVG(blueprintData);
        case "Side View":
            return generateSideViewSVG(blueprintData);
        default:
            return createPlaceholderImage(label, index);
    }
}

/**
 * Creates a placeholder image with proper visualization
 */
function createPlaceholderImage(label: string, index: number): string {
    const colors = ['#e3f2fd', '#f3e5f5', '#e8f5e9'];
    const color = colors[index % colors.length];
    
    const svg = `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <rect width="800" height="600" fill="${color}"/>
            <rect x="50" y="50" width="700" height="500" fill="white" stroke="#333" stroke-width="2" rx="10"/>
            <text x="400" y="280" text-anchor="middle" font-size="32" font-weight="bold" fill="#333">${label}</text>
            <text x="400" y="320" text-anchor="middle" font-size="18" fill="#666">AI-Generated Venue Transformation</text>
            <text x="400" y="350" text-anchor="middle" font-size="14" fill="#999">Powered by Nano Banana (Gemini 2.5 Flash Image)</text>
            <rect x="300" y="380" width="200" height="60" fill="${color}" stroke="#333" stroke-width="1" rx="5"/>
            <text x="400" y="415" text-anchor="middle" font-size="14" fill="#333">Processing...</text>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

/**
 * Generates a floor plan SVG as fallback
 */
function generateFloorPlanSVG(blueprintData: BlueprintData): string {
    const svg = `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="800" height="600" fill="#f5f5f5"/>
            
            <!-- Title -->
            <text x="400" y="30" text-anchor="middle" font-size="24" font-weight="bold" fill="#333">Floor Plan</text>
            <text x="400" y="55" text-anchor="middle" font-size="14" fill="#666">Event Layout - Top View</text>
            
            <!-- Grid Pattern -->
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
                </pattern>
            </defs>
            <rect x="100" y="80" width="600" height="450" fill="url(#grid)"/>
            
            <!-- Venue Outline -->
            <rect x="100" y="80" width="600" height="450" fill="white" stroke="#333" stroke-width="3"/>
            
            <!-- Main Event Space -->
            <rect x="200" y="150" width="400" height="280" fill="#e8f5e9" stroke="#333" stroke-width="2"/>
            <text x="400" y="290" text-anchor="middle" font-size="20" font-weight="bold">Main Event Space</text>
            
            <!-- Stage Area -->
            <rect x="250" y="160" width="300" height="80" fill="#ffecb3" stroke="#333" stroke-width="2"/>
            <text x="400" y="205" text-anchor="middle" font-size="16">Stage / Presentation</text>
            
            <!-- Reception -->
            <rect x="100" y="80" width="100" height="120" fill="#e3f2fd" stroke="#333" stroke-width="2"/>
            <text x="150" y="140" text-anchor="middle" font-size="14" font-weight="bold">Reception</text>
            
            <!-- Catering -->
            <rect x="600" y="80" width="100" height="180" fill="#fff3e0" stroke="#333" stroke-width="2"/>
            <text x="650" y="170" text-anchor="middle" font-size="14" font-weight="bold">Catering</text>
            
            <!-- Service Areas -->
            <rect x="600" y="300" width="100" height="100" fill="#f3e5f5" stroke="#333" stroke-width="2"/>
            <text x="650" y="350" text-anchor="middle" font-size="14">Service</text>
            
            <!-- Entrance -->
            <rect x="140" y="75" width="20" height="10" fill="#2196f3"/>
            <text x="150" y="70" text-anchor="middle" font-size="12" fill="#2196f3">Entrance</text>
            
            <!-- Exit -->
            <rect x="380" y="525" width="40" height="10" fill="#4caf50"/>
            <text x="400" y="550" text-anchor="middle" font-size="12" fill="#4caf50">Emergency Exit</text>
            
            <!-- Legend -->
            <g transform="translate(50, 560)">
                <text x="0" y="0" font-size="12" font-weight="bold">Legend:</text>
                <rect x="60" y="-12" width="20" height="15" fill="#e8f5e9"/>
                <text x="85" y="0" font-size="11">Event Space</text>
                <rect x="160" y="-12" width="20" height="15" fill="#ffecb3"/>
                <text x="185" y="0" font-size="11">Stage</text>
                <rect x="240" y="-12" width="20" height="15" fill="#e3f2fd"/>
                <text x="265" y="0" font-size="11">Reception</text>
                <rect x="340" y="-12" width="20" height="15" fill="#fff3e0"/>
                <text x="365" y="0" font-size="11">Catering</text>
            </g>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

/**
 * Generates a side elevation view SVG as fallback
 */
function generateSideViewSVG(blueprintData: BlueprintData): string {
    const svg = `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="800" height="600" fill="#f5f5f5"/>
            
            <!-- Title -->
            <text x="400" y="30" text-anchor="middle" font-size="24" font-weight="bold" fill="#333">Side Elevation View</text>
            <text x="400" y="55" text-anchor="middle" font-size="14" fill="#666">Event Space Cross-Section</text>
            
            <!-- Grid for scale -->
            <defs>
                <pattern id="sideGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.3"/>
                </pattern>
            </defs>
            <rect x="100" y="80" width="600" height="400" fill="url(#sideGrid)"/>
            
            <!-- Floor and Ceiling Lines -->
            <line x1="100" y1="400" x2="700" y2="400" stroke="#333" stroke-width="2"/>
            <line x1="100" y1="150" x2="700" y2="150" stroke="#333" stroke-width="2"/>
            
            <!-- Wall outlines -->
            <line x1="100" y1="150" x2="100" y2="400" stroke="#333" stroke-width="2"/>
            <line x1="700" y1="150" x2="700" y2="400" stroke="#333" stroke-width="2"/>
            
            <!-- Stage Platform -->
            <rect x="150" y="360" width="180" height="40" fill="#ffecb3" stroke="#333" stroke-width="1"/>
            <text x="240" y="385" text-anchor="middle" font-size="12" fill="#333">Stage</text>
            
            <!-- Stage Backdrop/Screen -->
            <rect x="160" y="200" width="160" height="160" fill="#e3f2fd" stroke="#333" stroke-width="1"/>
            <text x="240" y="280" text-anchor="middle" font-size="11" fill="#666">Projection Screen</text>
            
            <!-- Seating Rows (side view) -->
            <g id="seatRow">
                <rect width="30" height="25" fill="#95a5a6" stroke="#333" stroke-width="0.5"/>
            </g>
            
            <!-- Row 1 -->
            <use href="#seatRow" x="380" y="375"/>
            <use href="#seatRow" x="420" y="375"/>
            <use href="#seatRow" x="460" y="375"/>
            <use href="#seatRow" x="500" y="375"/>
            <use href="#seatRow" x="540" y="375"/>
            <use href="#seatRow" x="580" y="375"/>
            <use href="#seatRow" x="620" y="375"/>
            
            <!-- Row 2 (elevated) -->
            <rect x="380" y="365" width="280" height="10" fill="#d4d4d4" stroke="#333" stroke-width="0.5"/>
            <use href="#seatRow" x="380" y="340"/>
            <use href="#seatRow" x="420" y="340"/>
            <use href="#seatRow" x="460" y="340"/>
            <use href="#seatRow" x="500" y="340"/>
            <use href="#seatRow" x="540" y="340"/>
            <use href="#seatRow" x="580" y="340"/>
            <use href="#seatRow" x="620" y="340"/>
            
            <!-- Lighting Rigs -->
            <line x1="200" y1="150" x2="200" y2="180" stroke="#333" stroke-width="1"/>
            <circle cx="200" cy="185" r="8" fill="#ffd700" stroke="#333" stroke-width="1"/>
            <line x1="350" y1="150" x2="350" y2="180" stroke="#333" stroke-width="1"/>
            <circle cx="350" cy="185" r="8" fill="#ffd700" stroke="#333" stroke-width="1"/>
            <line x1="500" y1="150" x2="500" y2="180" stroke="#333" stroke-width="1"/>
            <circle cx="500" cy="185" r="8" fill="#ffd700" stroke="#333" stroke-width="1"/>
            <line x1="650" y1="150" x2="650" y2="180" stroke="#333" stroke-width="1"/>
            <circle cx="650" cy="185" r="8" fill="#ffd700" stroke="#333" stroke-width="1"/>
            
            <!-- Height Measurements -->
            <line x1="80" y1="150" x2="80" y2="400" stroke="#666" stroke-width="0.5"/>
            <line x1="75" y1="150" x2="85" y2="150" stroke="#666" stroke-width="0.5"/>
            <line x1="75" y1="400" x2="85" y2="400" stroke="#666" stroke-width="0.5"/>
            <text x="60" y="275" text-anchor="middle" font-size="10" fill="#666" transform="rotate(-90, 60, 275)">4.5m</text>
            
            <!-- Room Dimensions -->
            <line x1="100" y1="420" x2="700" y2="420" stroke="#666" stroke-width="0.5"/>
            <line x1="100" y1="415" x2="100" y2="425" stroke="#666" stroke-width="0.5"/>
            <line x1="700" y1="415" x2="700" y2="425" stroke="#666" stroke-width="0.5"/>
            <text x="400" y="440" text-anchor="middle" font-size="10" fill="#666">18m</text>
            
            <!-- Legend -->
            <text x="100" y="520" font-size="11" font-weight="bold" fill="#333">Legend:</text>
            <rect x="100" y="530" width="20" height="15" fill="#ffecb3" stroke="#333" stroke-width="0.5"/>
            <text x="125" y="541" font-size="10" fill="#333">Stage</text>
            <rect x="200" y="530" width="20" height="15" fill="#95a5a6" stroke="#333" stroke-width="0.5"/>
            <text x="225" y="541" font-size="10" fill="#333">Seating</text>
            <circle cx="290" cy="538" r="6" fill="#ffd700" stroke="#333" stroke-width="0.5"/>
            <text x="300" y="541" font-size="10" fill="#333">Lighting</text>
            
            <!-- Scale -->
            <text x="400" y="580" text-anchor="middle" font-size="11" fill="#999">Scale 1:100</text>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

/**
 * Generates a main event space SVG as fallback
 */
function generateMainSpaceSVG(blueprintData: BlueprintData): string {
    const svg = `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="800" height="600" fill="#2c3e50"/>
            
            <!-- Title -->
            <text x="400" y="30" text-anchor="middle" font-size="24" font-weight="bold" fill="white">Main Event Space</text>
            <text x="400" y="55" text-anchor="middle" font-size="14" fill="#ecf0f1">Transformed Venue Interior</text>
            
            <!-- Stage Area -->
            <rect x="200" y="100" width="400" height="150" fill="#34495e" stroke="#ecf0f1" stroke-width="2"/>
            <rect x="250" y="120" width="300" height="100" fill="#1abc9c"/>
            <text x="400" y="175" text-anchor="middle" font-size="20" font-weight="bold" fill="white">STAGE</text>
            
            <!-- Stage Lighting -->
            <circle cx="250" cy="100" r="15" fill="#f39c12" opacity="0.8"/>
            <circle cx="350" cy="100" r="15" fill="#f39c12" opacity="0.8"/>
            <circle cx="450" cy="100" r="15" fill="#f39c12" opacity="0.8"/>
            <circle cx="550" cy="100" r="15" fill="#f39c12" opacity="0.8"/>
            
            <!-- Seating Areas -->
            <g id="table">
                <circle r="25" fill="#95a5a6" stroke="#34495e" stroke-width="2"/>
                <circle r="18" fill="#ecf0f1"/>
            </g>
            
            <!-- Row 1 -->
            <use href="#table" x="150" y="320"/>
            <use href="#table" x="250" y="320"/>
            <use href="#table" x="350" y="320"/>
            <use href="#table" x="450" y="320"/>
            <use href="#table" x="550" y="320"/>
            <use href="#table" x="650" y="320"/>
            
            <!-- Row 2 -->
            <use href="#table" x="150" y="420"/>
            <use href="#table" x="250" y="420"/>
            <use href="#table" x="350" y="420"/>
            <use href="#table" x="450" y="420"/>
            <use href="#table" x="550" y="420"/>
            <use href="#table" x="650" y="420"/>
            
            <!-- Row 3 -->
            <use href="#table" x="200" y="520"/>
            <use href="#table" x="300" y="520"/>
            <use href="#table" x="400" y="520"/>
            <use href="#table" x="500" y="520"/>
            <use href="#table" x="600" y="520"/>
            
            <!-- Decorative Draping -->
            <path d="M 50 80 Q 200 120, 350 80 T 650 80" fill="none" stroke="#9b59b6" stroke-width="3" opacity="0.6"/>
            <path d="M 100 80 Q 250 120, 400 80 T 700 80" fill="none" stroke="#9b59b6" stroke-width="3" opacity="0.6"/>
            
            <!-- Ambient Lighting Effect -->
            <ellipse cx="400" cy="350" rx="350" ry="200" fill="url(#lightGradient)" opacity="0.3"/>
            
            <defs>
                <radialGradient id="lightGradient">
                    <stop offset="0%" style="stop-color:#f39c12;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#f39c12;stop-opacity:0" />
                </radialGradient>
            </defs>
            
            <text x="400" y="580" text-anchor="middle" font-size="12" fill="#95a5a6">Event Setup with Lighting & Decoration</text>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Export all necessary functions and constants
export { cleanUpImages, cleanBase64, SUPPORTED_IMAGE_MIME_TYPES };