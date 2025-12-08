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
  
  // Separate complex logic into systemInstruction to avoid confusing the model in the content stream
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        systemInstruction: systemInstruction, // Moved here
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
        mimeType: 'image/png'
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