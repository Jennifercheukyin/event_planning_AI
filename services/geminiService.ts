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
        
        // Create comprehensive analysis prompt with precise mapping requirements
        const blueprintPrompt = `
You are an expert venue analyst and event planner. Your task is to PRECISELY map and analyze the actual venue shown in these images.

Event Request: ${prompt || 'General event planning'}
Location: ${location ? (typeof location === 'string' ? location : `Coordinates: ${location.latitude}, ${location.longitude}`) : 'Not specified'}
Venue Website: ${venueWebsite || 'Not provided'}

CRITICAL RULES:
1. DO NOT HALLUCINATE OR MAKE UP FEATURES - only describe what you can actually see
2. BE SPECIFIC about locations - use directional references (north/south/left/right from camera view)
3. ESTIMATE dimensions based on visible references (people, doors, cars, etc.)

Perform a PRECISE SPATIAL ANALYSIS:

## STEP 1: VENUE IDENTIFICATION
First, identify what type of venue this is based on visual evidence:
- Outdoor lawn/garden: Note if it's residential, park, estate, etc.
- Indoor space: Ballroom, warehouse, hall, etc.
- Mixed indoor/outdoor: Describe both areas

## STEP 2: DETAILED SPATIAL MAPPING

### For OUTDOOR VENUES:
Create a detailed map describing:
- **Overall shape and boundaries**: "The lawn is L-shaped with the main section running east-west (approx 60x40ft) and a smaller section extending north (20x30ft)"
- **Terrain features**: 
  * "Ground slopes down 3-4ft from north to south"
  * "Level area in the center approximately 30x30ft"
  * "Raised garden bed along eastern edge, 2ft high"
- **Natural elements with exact positions**:
  * "Large oak tree (trunk ~3ft diameter) in northwest corner"
  * "Row of 6 palm trees along southern boundary, spaced ~10ft apart"
  * "Rose garden in southeast corner, circular, ~15ft diameter"
- **Hard surfaces**:
  * "Concrete patio 20x15ft adjacent to building on west side"
  * "Brick pathway 4ft wide curves from northwest entrance to east side"
- **Structures & boundaries**:
  * "White wooden fence 4ft high on north and east sides"
  * "Stone retaining wall 3ft high along southern slope"
  * "Building/house on west side with French doors opening to lawn"

### For INDOOR VENUES:
Create a detailed map describing:
- **Room dimensions & shape**: "Main hall is rectangular 80x50ft with 20ft ceiling"
- **Architectural features**:
  * "6 columns in two rows of 3, positioned 20ft from each wall"
  * "Stage alcove on north wall, 30x15ft, raised 3ft"
  * "Balcony/mezzanine on south side, 60ft long, 15ft deep"
- **Entry/exit points**: "Main entrance: double doors center south wall, Emergency exits: single doors in each corner"
- **Windows**: "10 arched windows on east wall, each 8ft tall, starting 6ft from floor"
- **Fixed features**: "Built-in bar in southwest corner 20ft long, Dance floor inlay center of room 30x30ft"

## STEP 3: ACCURATE MEASUREMENTS
Use visible references to estimate scale:
- Standard door = 3ft wide, 7ft tall
- Average person = 5.5-6ft tall
- Folding chair = 18" wide
- Round banquet table = typically 5-6ft diameter
- Parking space = 9ft wide
- Car = ~15ft long

## STEP 4: CONSTRAINTS AND LIMITATIONS
Based on ACTUAL observations:
- **Unusable areas**: "Northeast corner has exposed tree roots, unsafe for tables"
- **Access limitations**: "Only vehicle access from south gate, 8ft wide"
- **Power/utilities**: "Electrical outlets visible on west wall only"
- **Weather considerations**: "No natural shade except under oak tree"
- **Ground conditions**: "Grass appears soft/muddy in low area near southern fence"

## STEP 5: EVENT-SPECIFIC LAYOUT
For the requested event (${prompt}), design a layout using ONLY the actual space:

- **Guest seating/tables**: Place exactly where ground is level and stable
- **Service areas**: Position based on actual access points and power
- **Entertainment/stage**: Locate where sight lines work with actual terrain
- **Traffic flow**: Design paths that follow existing walkways or level ground

Example format:
"Place ceremony seating (10 rows of 10 chairs) on the level lawn area (center, 30x30ft section). Aisle runs north-south following existing brick path. Altar positioned under oak tree (natural focal point). Cocktail area on concrete patio (west side) where ground is stable and near building access."

## STEP 6: VENUE REALITY CHECK
Confirm these details:
- Total usable square footage: [Calculate based on actual visible space]
- Maximum realistic capacity: [Based on actual space minus obstacles]
- Required rentals: [Only for things not present - don't assume anything exists]
- Setup challenges: [Specific to this actual venue]

Your analysis must be so precise that someone could recreate an accurate floor plan from your description alone.
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
                prompt: `You are an expert architectural CAD specialist creating a PRECISE TOP-DOWN FLOOR PLAN based on the ACTUAL venue layout.

CRITICAL REQUIREMENTS:
1. This MUST be a TRUE BIRD'S-EYE VIEW - looking straight down from above
2. NO PERSPECTIVE, NO 3D ELEMENTS - pure 2D top-down view
3. The floor plan MUST accurately represent the EXACT venue from the photos

VENUE ANALYSIS FROM PHOTOS:
${blueprintData.blueprint}

CREATE A PROFESSIONAL TOP-DOWN ARCHITECTURAL FLOOR PLAN:

## VIEW SPECIFICATION:
- **Perspective**: DIRECTLY FROM ABOVE (90-degree angle looking straight down)
- **Style**: Technical architectural drawing, like looking at a blueprint
- **Representation**: 2D only - no 3D elements, no isometric view, no perspective

## DRAWING REQUIREMENTS:

### 1. TRUE TOP-DOWN REPRESENTATION

**For OUTDOOR VENUES - Bird's-eye view showing:**
- Exact perimeter/boundary lines of the property
- Tree canopies as circles (with trunk dot in center)
- Pathways as parallel lines showing width
- Buildings as solid rectangles (roof view)
- Lawn areas with appropriate hatching
- Garden beds as outlined shapes
- Fences as dashed or solid lines
- Elevation contours as thin lines (if slopes exist)

**For INDOOR VENUES - Ceiling removed view showing:**
- Walls as thick black lines (typically 6" thick)
- Doors as arcs showing swing direction
- Windows as double lines in walls
- Columns as solid circles or squares
- Built-in fixtures as appropriate shapes
- Flooring patterns/materials indicated
- Room labels and dimensions

### 2. ARCHITECTURAL DRAWING STANDARDS

**Line weights (CRITICAL for readability):**
- Property boundaries: 0.7mm (thick)
- Building walls: 0.5mm (medium-thick)
- Doors/windows: 0.35mm (medium)
- Furniture: 0.25mm (thin)
- Dimensions/annotations: 0.18mm (very thin)
- Hatching/patterns: 0.13mm (ultra-thin)

**Standard symbols (TOP VIEW ONLY):**
- Trees: Circle with center dot (crown diameter)
- Round tables: Perfect circles
- Rectangular tables: Rectangles
- Chairs: Small squares or circles
- Stage: Rectangle with "STAGE" label
- Tents: Dashed outline rectangles
- Restrooms: Standard architectural symbols

### 3. SCALE AND GRID

**Professional scaling:**
- Scale bar showing: 0' 5' 10' 20' 40'
- Grid overlay: Light gray lines every 10 feet
- Dimension strings with arrows
- All measurements in feet and inches

### 4. EVENT SETUP OVERLAY (TOP VIEW)
Show all event elements as seen from directly above:
- Table arrangements (circles and rectangles)
- Chair positions (small circles around tables)
- Dance floor (outlined rectangle with diagonal hatching)
- Bar locations (rectangles with "BAR" label)
- Buffet lines (long rectangles)
- Stage/band area (rectangle with equipment layout)
- Tent positions (dashed outlines)

### 5. TECHNICAL ANNOTATIONS

**Required elements:**
- Title: "FLOOR PLAN - [Event Type]"
- Scale: "1/8 inch = 1 foot"
- Date: Current date
- Venue: Venue name/location
- Create a clean title block in the top right corner

**North arrow:** 
- Place in upper right corner
- Simple arrow pointing north with "N" label

**Legend (clean, organized):**
Create a legend box with these items:
- Property Line (solid thick line)
- Building Wall (solid medium line)
- Fence (dashed line)
- Existing Tree (circle with center dot)
- Round Table (filled circle)
- Rectangular Table (rectangle)
- Dance Floor (hatched area)
- Stage/Platform (solid rectangle with label)

### 6. DIMENSIONAL ACCURACY
Include dimension strings showing:
- Overall property/room dimensions
- Distances between key features
- Clearances and aisles (min 4' for accessibility)
- Service area dimensions
- Stage/dance floor sizes

## CRITICAL REMINDERS:
- This is a TECHNICAL DRAWING, not an artistic rendering
- PURE TOP-DOWN VIEW - no angle, no perspective
- Like looking at Google Maps satellite view with labels
- Everything is shown as if the roof/ceiling is removed
- All elements are drawn as they appear from directly above
- Clean, precise, professional CAD-style drawing

## OUTPUT STYLE:
- Clean white background
- Black linework with appropriate weights
- Gray shading for different areas (10%, 20%, 30% gray)
- Professional architectural drawing appearance
- Similar to construction documents or permit drawings

Generate a PRECISE, PROFESSIONAL, TRUE BIRD'S-EYE VIEW FLOOR PLAN that could be used for actual event planning and setup.`
            },
            {
                label: "Main Event Space",
                prompt: `You are an expert event photographer. Create a PHOTOREALISTIC visualization showing the EXACT venue from the photos transformed for the event.

CRITICAL REQUIREMENTS:
1. This must be a PHOTOGRAPH of the ACTUAL VENUE - not a generic event space
2. Maintain ALL architectural features, dimensions, and layout from the original photos
3. The transformation must work with the REAL constraints identified in the analysis

VENUE ANALYSIS:
${blueprintData.blueprint}

CREATE A PHOTOREALISTIC IMAGE SHOWING:

## TIME SETTING: EVENING (7:00 PM)
- Golden hour transitioning to blue hour
- Warm ambient lighting throughout
- Sky visible through windows/outdoors: deep blue-purple twilight
- All decorative lighting activated

## VENUE-SPECIFIC TRANSFORMATION:

**For OUTDOOR VENUES:**
- Keep the EXACT landscape: every tree, slope, pathway in its actual position
- Add event setup that works with the terrain:
  * Tents/canopies only where ground is level
  * Tables positioned around existing trees
  * Lighting strung between actual anchor points
  * Pathways following natural routes
- Show the actual boundaries (fences, walls, buildings) transformed with:
  * Uplighting on trees that actually exist
  * Draping on real structures
  * Lanterns along actual pathways

**For INDOOR VENUES:**
- Maintain the EXACT room architecture:
  * Same ceiling height and style
  * Windows and doors in actual positions
  * Columns, alcoves, built-in features unchanged
- Add transformation elements:
  * Uplighting on actual walls/columns
  * Centerpieces on tables placed around real obstacles
  * Dance floor in the actual open space available
  * Decor that fits the real dimensions

## SPECIFIC DETAILS TO INCLUDE:

1. **Lighting Design:**
   - String lights/bistro lights between actual anchor points
   - Uplighting on real architectural features
   - Candles/lanterns creating warm glow
   - Spotlights highlighting actual focal points

2. **Guest Activity:**
   - 60-80% capacity based on actual space analysis
   - Guests in semi-formal evening attire
   - Natural groupings: mingling, seated, dancing
   - Servers circulating in actual pathways

3. **Event Elements Based on Type:**
   - Wedding: Ceremony setup where terrain allows
   - Corporate: Presentation area with sight lines
   - Party: Dance floor in largest flat area
   - Gala: Elegant seating maximizing actual space

4. **Authentic Details:**
   - Catering stations where access exists
   - Bar positioned near power/water if available
   - Guest flow following natural paths
   - Emergency exits kept clear

## PHOTOGRAPHY SPECIFICATIONS:
- Angle: Wide shot from optimal vantage point
- Lighting: Professional event photography with golden hour ambiance
- Focus: Sharp throughout with slight depth of field
- Style: Editorial quality, like Vogue or Martha Stewart Weddings
- Mood: Elegant, warm, inviting, sophisticated

## ACCURACY CHECK:
The transformed venue must be immediately recognizable as the SAME SPACE from the input photos, just decorated for an event. Someone familiar with the venue should say "Yes, that's definitely our space!"

Generate a stunning PHOTOREALISTIC image that shows this EXACT venue transformed for an elegant evening event.`
            },
            {
                label: "Side View",
                prompt: `You are an expert event photographer. Create a PHOTOREALISTIC SIDE VIEW of the EXACT venue from the photos, transformed for the event.

CRITICAL: This must show the SAME ACTUAL VENUE from a different angle - not a generic space.

VENUE ANALYSIS:
${blueprintData.blueprint}

CREATE A SIDE-ANGLE PHOTOGRAPH SHOWING:

## CAMERA POSITION & ANGLE:
- Shot from the side/corner of the actual venue
- Perspective showing depth and layers of the space
- Include foreground, middle ground, and background elements
- Natural guest's-eye-view from standing position

## TIME: EVENING 7:00 PM (Matching Main View)
- Identical lighting conditions to main event space
- Same twilight sky visible through windows/outdoors
- Consistent warm golden hour into blue hour lighting
- All decorative lights on and glowing

## VENUE-SPECIFIC SIDE VIEW:

**For OUTDOOR VENUES:**
- Show the terrain's actual slope/levels from the side
- Capture how tents/structures work with the landscape
- Display the layering of natural features (trees, garden beds)
- Show actual boundaries and neighboring structures
- Include:
  * String lights creating depth between trees
  * Guest tables following the terrain
  * Natural elevation changes visible
  * Pathways winding through the space

**For INDOOR VENUES:**
- Capture the actual room depth and height
- Show architectural features from side angle:
  * Columns creating perspective
  * Windows along the wall
  * Ceiling details and height
  * Any balconies or level changes
- Include:
  * Table arrangements receding into distance
  * Dance floor relationship to seating
  * Bar/service areas in proper position
  * Stage/focal point if applicable

## COMPOSITION ELEMENTS:

1. **Foreground (Closest to camera):**
   - Partial view of nearest table with place settings
   - Guests in sharp focus, some in motion
   - Decorative elements (flowers, candles) in detail

2. **Middle Ground:**
   - Main event activity area
   - Multiple tables/seating areas
   - Clear view of the actual space layout
   - Servers and guests interacting

3. **Background:**
   - Focal point (stage, head table, ceremony area)
   - Architectural features creating depth
   - Atmospheric lighting and shadows
   - Windows/exits maintaining venue accuracy

## LIGHTING DETAIL:
- Warm key light from decorative sources
- Soft fill from ambient evening light
- Rim lighting on guests from string lights
- Candle glow on tables
- Consistent 7:00 PM evening atmosphere

## SPECIFIC REQUIREMENTS:
- Show how the event setup works with actual venue constraints
- Capture the real scale and proportions of the space
- Include authentic details that match the venue analysis
- Maintain recognizable venue features from side angle

## PHOTOGRAPHY STYLE:
- Professional event photography
- Slightly shallow depth of field (f/2.8-4)
- Warm color grading matching golden hour
- Editorial quality composition
- Natural, candid feeling despite being staged

## AUTHENTICITY CHECK:
The side view must clearly show this is the SAME VENUE as the main view, just from a different perspective. All architectural features, dimensions, and constraints from the analysis must be visible and accurate.

Generate a stunning PHOTOREALISTIC SIDE VIEW that captures the depth and atmosphere of this EXACT venue during the evening event.`
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
 * Generates a photorealistic-style side view SVG as fallback
 */
function generateSideViewSVG(blueprintData: BlueprintData): string {
    const svg = `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <!-- Gradient definitions for photorealistic effect -->
            <defs>
                <linearGradient id="sideWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#2a2a2a"/>
                    <stop offset="50%" style="stop-color:#3a3a3a"/>
                    <stop offset="100%" style="stop-color:#2a2a2a"/>
                </linearGradient>
                <radialGradient id="sideLighting" cx="50%" cy="40%">
                    <stop offset="0%" style="stop-color:#fff8dc;stop-opacity:0.5"/>
                    <stop offset="100%" style="stop-color:#fff8dc;stop-opacity:0"/>
                </radialGradient>
                <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#3a3a3a"/>
                    <stop offset="100%" style="stop-color:#1a1a1a"/>
                </linearGradient>
            </defs>
            
            <!-- Dark venue background -->
            <rect width="800" height="600" fill="url(#sideWallGrad)"/>
            
            <!-- Title -->
            <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="300" fill="#fff" opacity="0.9">Side View</text>
            <text x="400" y="50" text-anchor="middle" font-size="12" fill="#ddd" opacity="0.7">Photorealistic Angle</text>
            
            <!-- Floor with glossy effect -->
            <rect x="0" y="420" width="800" height="180" fill="url(#floorGrad)"/>
            <rect x="0" y="420" width="800" height="180" fill="url(#sideLighting)" opacity="0.2"/>
            
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
 * Generates a photorealistic-style main event space SVG as fallback
 */
function generateMainSpaceSVG(blueprintData: BlueprintData): string {
    const svg = `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <!-- Gradient definitions for realistic lighting -->
            <defs>
                <radialGradient id="spotlight1" cx="50%" cy="30%">
                    <stop offset="0%" style="stop-color:#fff8dc;stop-opacity:0.8"/>
                    <stop offset="100%" style="stop-color:#fff8dc;stop-opacity:0"/>
                </radialGradient>
                <radialGradient id="spotlight2" cx="30%" cy="40%">
                    <stop offset="0%" style="stop-color:#ffd700;stop-opacity:0.6"/>
                    <stop offset="100%" style="stop-color:#ffd700;stop-opacity:0"/>
                </radialGradient>
                <linearGradient id="wallGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#3a3a3a"/>
                    <stop offset="100%" style="stop-color:#1a1a1a"/>
                </linearGradient>
            </defs>
            
            <!-- Dark elegant background -->
            <rect width="800" height="600" fill="url(#wallGradient)"/>
            
            <!-- Floor with reflection effect -->
            <rect x="0" y="400" width="800" height="200" fill="#2c2c2c"/>
            <rect x="0" y="400" width="800" height="200" fill="url(#spotlight1)" opacity="0.3"/>
            
            <!-- Title -->
            <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="300" fill="#fff" opacity="0.9">Main Event Space</text>
            <text x="400" y="50" text-anchor="middle" font-size="12" fill="#ddd" opacity="0.7">Photorealistic View</text>
            
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