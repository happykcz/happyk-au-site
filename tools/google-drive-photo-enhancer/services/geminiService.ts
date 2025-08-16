import { GoogleGenAI, Type } from "@google/genai";
import { AIEnhancementSuggestion, Photo } from '../types';

const MOCK_DELAY = 1000;

// New type for adjustments
type AIAdjustmentSuggestion = {
    adjustments: NonNullable<Photo['adjustments']>;
    enhancementNotes: string;
};

// 1. Auto Enhance Picture
export const getAIAutoAdjustments = async (photoName: string): Promise<AIAdjustmentSuggestion> => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not set. Returning mock enhancement data.");
    return new Promise(resolve => setTimeout(() => resolve({
      adjustments: { brightness: 115, contrast: 120, saturation: 125 },
      enhancementNotes: "Automatically adjusted for a more vibrant and balanced look, increasing contrast and saturation slightly."
    }), MOCK_DELAY));
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const textPart = {
    text: `Analyze the context of a photo named "${photoName}". Suggest optimal adjustments for brightness, contrast, and saturation. Return values between 0 and 200, where 100 is no change. The goal is a balanced, professional, and vibrant image. Provide brief notes on your choices.`
  };
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          brightness: { type: Type.INTEGER, description: "Value between 0-200 for brightness." },
          contrast: { type: Type.INTEGER, description: "Value between 0-200 for contrast." },
          saturation: { type: Type.INTEGER, description: "Value between 0-200 for saturation." },
          enhancementNotes: { type: Type.STRING, description: "Brief summary of the adjustment choices." }
        },
        required: ["brightness", "contrast", "saturation", "enhancementNotes"]
      }
    }
  });

  const jsonResponse = JSON.parse(response.text);
  return {
    adjustments: {
      brightness: jsonResponse.brightness,
      contrast: jsonResponse.contrast,
      saturation: jsonResponse.saturation,
    },
    enhancementNotes: jsonResponse.enhancementNotes
  };
};

// 2. Generate Description
type AIDescriptionSuggestion = { suggestedDescription: string; enhancementNotes: string; };

export const getAIDescription = async (photoName: string, currentDescription: string): Promise<AIDescriptionSuggestion> => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not set. Returning mock description data.");
    return new Promise(resolve => setTimeout(() => resolve({
      suggestedDescription: "A breathtaking view of sun-drenched mountain peaks under a clear blue sky, evoking a sense of majesty and wonder.",
      enhancementNotes: "Generated a more evocative and descriptive caption for the photo."
    }), MOCK_DELAY));
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const textPart = {
    text: `The photo is named "${photoName}" and its current description is "${currentDescription}". Generate a new, compelling, and SEO-friendly one-sentence description. Provide a note about what you changed.`
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedDescription: { type: Type.STRING, description: "The new compelling description." },
          enhancementNotes: { type: Type.STRING, description: "A note on why this description is better." }
        },
        required: ["suggestedDescription", "enhancementNotes"]
      }
    }
  });
  
  return JSON.parse(response.text) as AIDescriptionSuggestion;
};


// 3. Generate Credits
type AICreditsSuggestion = { author: string; copyright: string; enhancementNotes: string; };

export const getAICredits = async (photoName: string, currentDescription: string): Promise<AICreditsSuggestion> => {
    if (!process.env.API_KEY) {
    console.warn("API_KEY not set. Returning mock credits data.");
    return new Promise(resolve => setTimeout(() => resolve({
      author: "Demo User",
      copyright: `© ${new Date().getFullYear()} Demo User. All rights reserved.`,
      enhancementNotes: "Generated author and copyright notice based on user data, assuming ownership."
    }), MOCK_DELAY));
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const textPart = {
    text: `Analyze the photo's filename "${photoName}" and description "${currentDescription}". Generate a suitable Author/Credit and a Copyright string. If a name is mentioned, use it. If not, suggest a placeholder "Photographer Name". For copyright, suggest a format like "© ${new Date().getFullYear()} Photographer Name. All rights reserved.". Provide a note on your findings.`
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          author: { type: Type.STRING, description: "The name of the author or a placeholder." },
          copyright: { type: Type.STRING, description: "The copyright notice." },
          enhancementNotes: { type: Type.STRING, description: "A note on how the credits were generated." }
        },
        required: ["author", "copyright", "enhancementNotes"]
      }
    }
  });
  
  return JSON.parse(response.text) as AICreditsSuggestion;
};


// 4. Optimize File details
type AIOptimizationSuggestion = Omit<AIEnhancementSuggestion, "suggestedDescription">;

export const getAIOptimization = async (photoName: string, originalFileSize: number): Promise<AIOptimizationSuggestion> => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not set. Returning mock optimization data.");
    return new Promise(resolve => setTimeout(() => resolve({
      suggestedFileName: `web-optimized-${photoName.toLowerCase().replace(/\s+/g, '-')}.jpg`,
      suggestedWidth: 1920,
      suggestedHeight: 1080,
      suggestedFileSize: Math.round(originalFileSize * 0.4),
      enhancementNotes: "Suggested a web-friendly filename and standard 1080p resolution for optimal loading and quality."
    }), MOCK_DELAY));
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const textPart = {
    text: `Analyze a photo named "${photoName}" for web optimization. Suggest a new SEO-friendly filename, a standard web resolution (like 1920x1080), an estimated optimized file size in bytes (original is ${originalFileSize} bytes), and a brief note on the choices made.`
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedFileName: { type: Type.STRING, description: "A SEO-friendly file name." },
          suggestedWidth: { type: Type.INTEGER, description: "Suggested width in pixels." },
          suggestedHeight: { type: Type.INTEGER, description: "Suggested height in pixels." },
          suggestedFileSize: { type: Type.INTEGER, description: "Estimated optimized file size in bytes." },
          enhancementNotes: { type: Type.STRING, description: "Summary of optimization choices." }
        },
        required: ["suggestedFileName", "suggestedWidth", "suggestedHeight", "suggestedFileSize", "enhancementNotes"]
      }
    }
  });
  
  return JSON.parse(response.text) as AIOptimizationSuggestion;
};
