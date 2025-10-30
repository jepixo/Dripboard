
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { type Avatar, type ClothingItem, type AlphaSize, ClothingCategory, CLOTHING_CATEGORIES } from '../types';
import { storageService } from './storageService';

const getAiClient = () => {
    const apiKey = storageService.getApiKey();
    if (!apiKey) {
      throw new Error("Gemini API Key not found. Please add your key via the 'More' menu.");
    }
    // Return a new instance each time. This ensures the latest key is always used.
    return new GoogleGenAI({ apiKey });
};

const fileToGenerativePart = async (imageDataUrl: string) => {
    const base64Data = imageDataUrl.split(',')[1];
    const mimeType = imageDataUrl.match(/data:(.*);base64,/)?.[1] ?? 'image/png';
    return {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    };
};

const getFitNote = (avatar: Avatar, item: ClothingItem): string => {
    if (item.category !== ClothingCategory.TOP && item.category !== ClothingCategory.BOTTOM) {
        return '';
    }

    const alphaToNumericMap: Record<AlphaSize, { chest: number; waist: number }> = {
        'S': { chest: 36, waist: 30 },
        'M': { chest: 40, waist: 34 },
        'L': { chest: 44, waist: 38 },
        'XL': { chest: 48, waist: 42 },
        'XXL': { chest: 52, waist: 46 },
        'XXXL': { chest: 56, waist: 50 },
    };

    let itemSize: number | null = null;
    let avatarMeasurement: number | null = null;

    if (item.category === ClothingCategory.TOP) {
        avatarMeasurement = avatar.chest ?? null;
        if (item.sizeSystem === 'numeric' && item.numericSize) {
            itemSize = item.numericSize;
        } else if (item.sizeSystem === 'alpha' && item.alphaSize) {
            itemSize = alphaToNumericMap[item.alphaSize].chest;
        }
    } else if (item.category === ClothingCategory.BOTTOM) {
        avatarMeasurement = avatar.waist ?? null;
        if (item.sizeSystem === 'numeric' && item.numericSize) {
            itemSize = item.numericSize;
        } else if (item.sizeSystem === 'alpha' && item.alphaSize) {
            itemSize = alphaToNumericMap[item.alphaSize].waist;
        }
    }

    if (itemSize === null || avatarMeasurement === null) {
        return '';
    }

    const diff = itemSize - avatarMeasurement;
    const sizeComparison = `(item: ${itemSize}", avatar: ${avatarMeasurement}")`;

    if (diff > 6) return `CRITICAL FIT NOTE: This item is significantly larger than the avatar ${sizeComparison}. It must be rendered as very oversized and baggy.`;
    if (diff > 2) return `Fit Note: This item is larger than the avatar ${sizeComparison}. It should have a loose, relaxed fit.`;
    if (diff >= -1) return `Fit Note: This item's size is very close to the avatar's measurements ${sizeComparison}. It should be rendered as a well-tailored, perfect fit.`;
    if (diff >= -4) return `Fit Note: This item is smaller than the avatar ${sizeComparison}. It should be rendered as a snug or tight fit.`;
    
    return `CRITICAL FIT NOTE: This item is significantly smaller than the avatar ${sizeComparison}. It must be rendered as very tight, possibly stretched or unable to close properly.`;
};

// Internal function to handle a single generation call.
const _generateSingleStep = async (
    avatar: Avatar,
    outfitItems: Partial<Record<ClothingCategory, ClothingItem[]>>,
    additionalPrompt: string,
    model: string
): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];
    
    parts.push(await fileToGenerativePart(avatar.imageDataUrl));

    const allClothingItems = CLOTHING_CATEGORIES.flatMap(category => outfitItems[category] || []).filter(
        (item): item is ClothingItem => !!item
    );

    for (const item of allClothingItems) {
        parts.push(await fileToGenerativePart(item.imageDataUrl));
    }
    
    const clothingInstructions = CLOTHING_CATEGORIES.map(category => {
        const itemsInCategory = outfitItems[category];
        if (!itemsInCategory || itemsInCategory.length === 0) return '';

        const itemPrompts = itemsInCategory.map(item => {
            const globalIndex = allClothingItems.findIndex(i => i.id === item.id);
            const imageIndex = globalIndex + 2;
            const descriptionText = item.description ? ` The item is described as: "${item.description}".` : '';
            const fitNote = getFitNote(avatar, item);
            const sizeNote = item.category === ClothingCategory.FOOTWEAR && item.shoeSize ? ` It is a UK size ${item.shoeSize}.` : '';
            return `- **'${item.name}'**: Take this item from image #${imageIndex}.${descriptionText}${sizeNote} ${fitNote}`;
        }).join('\n');

        const layeringInstruction = itemsInCategory.length > 1
            ? ` For this category, layer the items in the order listed (the first item is the base layer, the last is the top layer).`
            : '';

        return `\n**For ${category}:**${layeringInstruction}\n${itemPrompts}`;
    }).filter(Boolean).join('');

    const userInstructions = additionalPrompt
      ? `\n**User's Additional Instructions:**\n- ${additionalPrompt.replace(/\n/g, '\n- ')}`
      : '';

    const hasEyewear = outfitItems[ClothingCategory.EYEWEAR] && outfitItems[ClothingCategory.EYEWEAR].length > 0;
    const hasHeadwear = outfitItems[ClothingCategory.HEADWEAR] && outfitItems[ClothingCategory.HEADWEAR].length > 0;
    const hasFaceAccessory = hasEyewear || hasHeadwear;

    const prompt = `Your task is to edit image #1, which contains the main person (the model), by dressing them in clothing items from the other images.

**Golden Rules (NON-NEGOTIABLE):**
- **ABSOLUTE FACIAL PRESERVATION:** ${hasFaceAccessory ? `This is the most important rule. The person's face, hair, and skin tone from image #1 are sacred. They MUST BE PRESERVED PERFECTLY AND COMPLETELY. The new headwear/eyewear must be overlaid ON TOP of the original head without changing ANYTHING underneath. Do not alter eyes, nose, mouth, facial structure, or hair.` : `The person's face, hair, and skin tone from image #1 MUST be preserved perfectly.`}
- **COMPLETE CLOTHING REPLACEMENT:** When adding an item (e.g., a 'Top'), it must COMPLETELY REPLACE and HIDE the original item of the same category (e.g., the original shirt). The original clothing item for that slot MUST NOT be visible at all.
- **MAINTAIN ORIGINAL COMPOSITION & POSE:** The final image MUST perfectly match the framing, camera angle, zoom level, and composition of image #1. The person's body shape, pose, and visibility (e.g., full-body, waist-up) from image #1 MUST BE PRESERVED IDENTICALLY. Do not crop, zoom, or re-frame the image. The goal is a direct edit of image #1.
- **IGNORE OTHER PEOPLE:** The people in the other images (image #2, etc.) are only mannequins for the clothing. IGNORE them. Do NOT use their bodies or faces.

**Instructions:**
For each clothing item listed below, you will:
1.  Locate the clothing item in its corresponding image.
2.  Digitally "cut out" this clothing item.
3.  Place this item onto the person in image #1, following the **COMPLETE CLOTHING REPLACEMENT** Golden Rule.
4.  If multiple items are in one category, layer them as instructed.
5.  Fit the new items naturally, adapting to the pose and body shape of the person in image #1. Pay close attention to any fit notes.
6.  Retain any clothing on the person from image #1 that is NOT being replaced.

**Items to Change:**
${clothingInstructions}
${userInstructions}

**Final Output requirements:**
- The result must be a photorealistic, seamlessly edited image.
- The background from image #1 must be preserved.
- The output image must be a square (1:1 aspect ratio), matching the dimensions of the input.
- Do not add any text, logos, or other artifacts.`;
    
    parts.push({ text: prompt });

    const generateContentConfig: { responseModalities: Modality[] } = {
        responseModalities: [Modality.IMAGE],
    };

    if (model === 'gemini-2.0-flash-preview-image-generation') {
        generateContentConfig.responseModalities.push(Modality.TEXT);
    }

    const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: generateContentConfig,
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    
    if (imagePart && imagePart.inlineData) {
        const base64ImageBytes: string = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType;
        return `data:${mimeType};base64,${base64ImageBytes}`;
    }

    throw new Error("No image was generated by the API.");
};

export const geminiService = {
    createFullBodyAvatar: async (sourceImageDataUrl: string): Promise<string> => {
        const ai = getAiClient();
        try {
            const imagePart = await fileToGenerativePart(sourceImageDataUrl);
            const prompt = `From the provided image of a person, create a photorealistic, full-body image of them. The person should be standing still in a neutral, forward-facing pose, as if for a virtual clothing fitting. Place them against a simple, well-lit, light-gray studio background. Ensure the entire body from head to toe is visible. The final image should be just the person on the background, without any additional text, logos, or objects. The final image must be a square (1:1 aspect ratio).`;
            
            const parts = [imagePart, { text: prompt }];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const firstPart = response.candidates?.[0]?.content?.parts?.[0];
            if (firstPart && firstPart.inlineData) {
                const base64ImageBytes: string = firstPart.inlineData.data;
                const mimeType = firstPart.inlineData.mimeType;
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }

            throw new Error("No avatar image was generated by the API.");
        } catch (error) {
            console.error("Error creating full body avatar with Gemini:", error);
            throw new Error("Failed to generate avatar. Please check the uploaded image and your API key, then try again.");
        }
    },

    generateOutfitImage: async (
        avatar: Avatar,
        outfitItems: Partial<Record<ClothingCategory, ClothingItem[]>>,
        additionalPrompt: string,
        model: string
    ): Promise<string> => {
        try {
            const faceItemCategories = [ClothingCategory.HEADWEAR, ClothingCategory.EYEWEAR];

            const faceItems: Partial<Record<ClothingCategory, ClothingItem[]>> = {};
            const bodyItems: Partial<Record<ClothingCategory, ClothingItem[]>> = {};
            
            let hasFaceItems = false;
            let hasBodyItems = false;

            for (const category of CLOTHING_CATEGORIES) {
                const items = outfitItems[category];
                if (items && items.length > 0) {
                    if (faceItemCategories.includes(category)) {
                        faceItems[category] = items;
                        hasFaceItems = true;
                    } else {
                        bodyItems[category] = items;
                        hasBodyItems = true;
                    }
                }
            }
            
            // If there are both face items and body items, use a two-step process.
            if (hasFaceItems && hasBodyItems) {
                // Step 1: Generate image with only the face items to preserve the face.
                const intermediateImageUrl = await _generateSingleStep(avatar, faceItems, '', model);

                // Create a temporary avatar object using the result of the first step.
                const intermediateAvatar: Avatar = {
                    ...avatar,
                    imageDataUrl: intermediateImageUrl,
                };
                
                // Step 2: Use the new image to generate the final outfit with the body items.
                const finalImageUrl = await _generateSingleStep(intermediateAvatar, bodyItems, additionalPrompt, model);
                
                return finalImageUrl;
            } else {
                // Otherwise, use the standard single-step generation.
                return await _generateSingleStep(avatar, outfitItems, additionalPrompt, model);
            }
        } catch (error) {
            console.error("Error generating outfit image with Gemini:", error);
            throw new Error("Failed to generate outfit. Please check your API key and try again.");
        }
    },

    processClothingItem: async (
        sourceImageDataUrl: string,
        category: ClothingCategory,
        userDescription: string,
        shouldProcess: boolean
    ): Promise<{ imageDataUrl: string; analysis: { colors: string[]; fabrics: string[]; patterns: string[]; styles: string[] } }> => {
        const ai = getAiClient();
        try {
            let imageDataUrlForAnalysis = sourceImageDataUrl;
            let finalImageDataUrl = sourceImageDataUrl;

            const analysisSchema = {
                type: Type.OBJECT,
                properties: {
                    colors: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List the dominant colors. Use simple, common names (e.g., 'Red', 'Navy Blue', 'Beige')."
                    },
                    fabrics: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Identify the fabric(s) (e.g., 'Cotton', 'Denim', 'Silk', 'Leather')."
                    },
                    patterns: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Describe the pattern(s), if any (e.g., 'Striped', 'Plaid', 'Floral', 'Solid')."
                    },
                    styles: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Describe the style(s) (e.g., 'Casual', 'Formal', 'Vintage', 'Minimalist', 'Sporty')."
                    }
                },
                required: ["colors", "fabrics", "patterns", "styles"]
            };

            if (shouldProcess) {
                const imagePart = await fileToGenerativePart(sourceImageDataUrl);
                const descriptionPrompt = userDescription 
                    ? `The user provided this description to help identify it: "${userDescription}".` 
                    : 'Use the category name as the primary guide.';
                
                const cleanImagePrompt = `From the provided image, isolate the single clothing item that corresponds to the '${category}' category. ${descriptionPrompt}
Generate a new, photorealistic image of ONLY that item.
The item should be laid out flat or on an invisible mannequin, ready for a product catalog.
Place it against a solid, plain, light-gray background to ensure high contrast.
The final image must be clean, well-lit, and contain no other objects, text, or distracting shadows.
The final image must be a square (1:1 aspect ratio).`;

                const cleanResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [imagePart, { text: cleanImagePrompt }] },
                    config: {
                        responseModalities: [Modality.IMAGE],
                    },
                });
                
                const cleanedPart = cleanResponse.candidates?.[0]?.content?.parts?.[0];
                if (!cleanedPart || !cleanedPart.inlineData) {
                    throw new Error("No clothing item was generated by the API.");
                }

                const cleanedImageDataUrl = `data:${cleanedPart.inlineData.mimeType};base64,${cleanedPart.inlineData.data}`;
                finalImageDataUrl = cleanedImageDataUrl;
                imageDataUrlForAnalysis = cleanedImageDataUrl;
            }

            const imagePartForAnalysis = await fileToGenerativePart(imageDataUrlForAnalysis);
            const analysisPrompt = `Analyze the provided clothing item and describe its attributes. Provide your response as a JSON object.`;
            
            const analysisResponse = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: [imagePartForAnalysis, { text: analysisPrompt }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: analysisSchema,
                },
            });

            const analysisText = analysisResponse.text;
            const analysisJSON = analysisText ? JSON.parse(analysisText) : {};
            const analysis = typeof analysisJSON === 'object' && analysisJSON !== null ? analysisJSON : {};
            
            const validatedAnalysis = {
                colors: Array.isArray(analysis.colors) ? analysis.colors.map(String) : [],
                fabrics: Array.isArray(analysis.fabrics) ? analysis.fabrics.map(String) : [],
                patterns: Array.isArray(analysis.patterns) ? analysis.patterns.map(String) : [],
                styles: Array.isArray(analysis.styles) ? analysis.styles.map(String) : [],
            };

            return {
                imageDataUrl: finalImageDataUrl,
                analysis: validatedAnalysis,
            };

        } catch (error) {
            console.error("Error processing clothing item:", error);
            if (error instanceof Error) {
                throw new Error(`Failed to process clothing item: ${error.message}`);
            }
            throw new Error("Failed to process clothing item. The AI could not analyze the item.");
        }
    }
};
