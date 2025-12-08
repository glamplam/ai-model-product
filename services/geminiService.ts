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
  apiKey?: string
): Promise<string> => {
  
  const key = apiKey || process.env.API_KEY;

  if (!key) {
    throw new Error("API Key is missing. Please provide an API key.");
  }

  const ai = new GoogleGenAI({ apiKey: key });
  
  // Separate complex logic into systemInstruction
  const systemInstruction = `
    You are an expert fashion compositor and digital retoucher.
    
    TASK:
    Generate a high-quality photorealistic image of the person from the 'Model Reference' WEARING the item from the 'Product Reference'.

    STRICT RULES:
    1. **Product Fidelity**: The 'Product Reference' is the source of truth. You MUST match its color, texture, logo, and material exactly.
    2. **Model Identity**: Preserve the facial features and body type of the 'Model Reference'.
    3. **Pose & Setting**: Follow the 'User Instructions' for the pose and scene. If the user specifies a pose (e.g., sitting, running), adapt the model to that pose.
    4. **Realism**: Ensure realistic lighting, shadows, and fabric drape.
  `;

  // Simplify the content parts to just the inputs
  const parts: Part[] = [
    { text: "Model Reference:" },
    {
      inlineData: {
        data: modelImageBase64,
        mimeType: modelMimeType
      }
    },
    { text: "Product Reference:" },
    {
      inlineData: {
        data: productImageBase64,
        mimeType: productMimeType
      }
    },
    { text: `User Instructions: ${userPrompt}` }
  ];

  // Retry Logic
  let lastError;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: {
          systemInstruction: systemInstruction,
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
        // Exponential backoff: 2s, 4s, 8s
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
        mimeType: 'image/png'
      }
    },
    { text: `Edit instruction: ${prompt}` }
  ];

  // Retry Logic for Edit
  let lastError;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
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
