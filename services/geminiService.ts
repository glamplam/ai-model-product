import { GoogleGenAI, Part } from "@google/genai";

// Helper to extract base64 from Data URL
const extractBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

// Helper for delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateCompositeImage = async (
  modelImageBase64: string,
  modelMimeType: string,
  productImageBase64: string,
  productMimeType: string,
  userPrompt: string,
  aspectRatio: string,
  apiKey?: string
): Promise<string> => {
  
  // Clean the key immediately to prevent header errors
  const rawKey = apiKey || process.env.API_KEY;
  const key = rawKey?.trim();

  if (!key) {
    throw new Error("API Key is missing. Please provide an API key.");
  }

  const ai = new GoogleGenAI({ apiKey: key });
  
  // Separate complex logic into systemInstruction
  // DRAMATICALLY strengthened instructions for exact product replication
  const systemInstruction = `
    ROLE:
    You are an advanced AI Image Compositor specialized in e-commerce product placement. Your PRIMARY OBJECTIVE is "Pixel-Perfect Product Transfer".

    CRITICAL RULES FOR PRODUCT FIDELITY (SOURCE OF TRUTH):
    1. **Immutable Product Identity**: The 'Product Reference' image is SACRED. You must composite it onto the model WITHOUT altering its internal design details.
    2. **Text & Logo Preservation (Zero Hallucination)**: 
       - Treat all text, labels, and logos on the product as strictly READ-ONLY. 
       - Perform a mental "Copy and Paste" of the logos/text. 
       - DO NOT blur, warp, misspell, or "re-imagine" any text. If the label says "BRAND", it must appear exactly as "BRAND" in high definition.
    3. **Material & Texture**: Preserve the exact fabric weave, material finish (matte/glossy), and color hex code of the product.
    
    COMPOSITION RULES:
    1. **Model Adaptation**: The model (person) must adapt their pose and body shape to fit the product. Do NOT warp the product unnaturally to fit the model.
    2. **Lighting Integration**: Apply realistic lighting and shadows *around* the product to make it look worn, but ensure the product itself remains the focal point with high clarity.
    3. **Resolution**: Output at maximum sharpness. Focus specifically on the product area to ensure it is not pixelated.

    TASK:
    Generate a photorealistic image of the 'Model Reference' wearing the 'Product Reference' according to the 'User Instructions', while maintaining 100% fidelity to the product's original design and text.
  `;

  // Simplify the content parts to just the inputs
  const parts: Part[] = [
    { text: "Model Reference (Target Person):" },
    {
      inlineData: {
        data: modelImageBase64,
        mimeType: modelMimeType
      }
    },
    { text: "Product Reference (DO NOT ALTER TEXT OR LOGOS):" },
    {
      inlineData: {
        data: productImageBase64,
        mimeType: productMimeType
      }
    },
    { text: `Composition Instructions: ${userPrompt} --ensure product text is legible and exact.` }
  ];

  // Retry Logic
  let lastError;
  const maxRetries = 5; // Increased retries for heavy load

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: {
          systemInstruction: systemInstruction,
          imageConfig: {
            // Upgraded to 2K for better text/logo detail resolution
            imageSize: "2K",
            aspectRatio: aspectRatio
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

    } catch (error: any) {
      lastError = error;
      console.warn(`Attempt ${attempt + 1} failed:`, error.message);

      // Check for retryable errors (503 Overloaded, 500 Internal)
      const isRetryable = 
        error.status === 503 || 
        error.code === 503 || 
        error.status === 500 || 
        error.code === 500 ||
        (error.message && (error.message.includes("overloaded") || error.message.includes("Internal error")));

      if (isRetryable && attempt < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s, 16s...
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await wait(delay);
        continue;
      }

      // If not retryable or max retries reached, throw the error
      throw error;
    }
  }

  throw lastError;
};

export const editGeneratedImage = async (
  imageBase64: string,
  prompt: string,
  aspectRatio: string,
  apiKey?: string
): Promise<string> => {
  const rawKey = apiKey || process.env.API_KEY;
  const key = rawKey?.trim();
  
  if (!key) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: key });

  const parts: Part[] = [
    {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/png'
      }
    },
    { text: `Edit instruction (Maintain high resolution and text clarity): ${prompt}` }
  ];

  // Retry Logic for Edit
  let lastError;
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: {
          imageConfig: {
            // Upgraded to 2K for edits as well
            imageSize: "2K",
            aspectRatio: aspectRatio
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
    } catch (error: any) {
      lastError = error;
      
      const isRetryable = 
        error.status === 503 || 
        error.code === 503 || 
        error.status === 500 ||
        error.code === 500 ||
        (error.message && (error.message.includes("overloaded") || error.message.includes("Internal error")));

      if (isRetryable && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await wait(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};