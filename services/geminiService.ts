import { GoogleGenAI, Part } from "@google/genai";

// Helper to extract base64 from Data URL
const extractBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

export const generateCompositeImage = async (
  modelImageBase64: string,
  modelMimeType: string,
  productImageBase64: string,
  productMimeType: string,
  userPrompt: string,
  apiKey?: string
): Promise<string> => {
  
  const key = apiKey || process.env.API_KEY;

  if (!key) {
    throw new Error("API Key is missing. Please provide an API key.");
  }

  const ai = new GoogleGenAI({ apiKey: key });
  
  const systemPrompt = `
    You are an expert fashion compositor, digital retoucher, and product photographer.
    
    INPUTS:
    1. **Model Reference**: An image of a person.
    2. **Product Reference**: An image of a specific product (clothing, accessory, or item).
    3. **User Instructions**: Text describing the desired pose, action, or setting.

    YOUR TASK:
    Generate a high-quality photorealistic image of the person from the 'Model Reference' **WEARING** or **USING** the item from the 'Product Reference'.

    CRITICAL RULES FOR PRODUCT FIDELITY (HIGHEST PRIORITY):
    - **SOURCE OF TRUTH**: The 'Product Reference' image is the absolute authority for the product's appearance. 
    - **EXACT MATCH**: You MUST preserve the product's exact **color, texture, pattern, logos, text, and material**. Do NOT hallucinate new designs or change the product's style.
    - **REALISTIC FIT**: Warp and drape the product naturally onto the model's body in the requested pose. Ensure realistic folds, shadows, and lighting that match the scene.

    CRITICAL RULES FOR POSE & EDITING:
    - **POSE CONTROL**: Prioritize the **User Instructions** for the pose. If the user says "sitting", "running", or "raising arms", the model MUST be generated in that pose, even if it differs from the original image.
    - **IDENTITY**: Keep the model's facial features, hair, and body type consistent with the 'Model Reference'.
    - **INTEGRATION**: The product must replace the model's original clothing if it is a garment.

    OUTPUT:
    - A single, high-resolution, photorealistic image.
  `;

  const parts: Part[] = [
    { text: systemPrompt },
    { text: "IMAGE 1: Model Reference (Keep Identity):" },
    {
      inlineData: {
        data: modelImageBase64,
        mimeType: modelMimeType
      }
    },
    { text: "IMAGE 2: Product Reference (Source of Truth for Item):" },
    {
      inlineData: {
        data: productImageBase64,
        mimeType: productMimeType
      }
    },
    { text: `COMMAND: Generate the model from Image 1 WEARING the product from Image 2. \nSPECIFIC POSE/SCENE INSTRUCTIONS: ${userPrompt}` }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          imageSize: "1K",
          aspectRatio: "1:1"
        }
      }
    });

    // Iterate through parts to find the image
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in the response.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const editGeneratedImage = async (
  imageBase64: string,
  prompt: string,
  apiKey?: string
): Promise<string> => {
  const key = apiKey || process.env.API_KEY;
  if (!key) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: key });

  const parts: Part[] = [
    {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/png' // Assuming generated images are PNG
      }
    },
    { text: `Edit instruction: ${prompt}` }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          imageSize: "1K",
          aspectRatio: "1:1"
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image generated during edit.");
  } catch (error) {
    console.error("Gemini Edit Error:", error);
    throw error;
  }
};