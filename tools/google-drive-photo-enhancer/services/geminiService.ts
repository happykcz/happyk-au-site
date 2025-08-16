import { AIEnhancementSuggestion, Photo } from '../types';

const MOCK_DELAY = 600;

// Minimal runtime config loader (cached)
let runtimeConfig: { geminiApiKey?: string } | null | undefined;
async function getRuntimeConfig(): Promise<{ geminiApiKey?: string } | null> {
  if (runtimeConfig !== undefined) return runtimeConfig ?? null;
  try {
    const res = await fetch('./config.json', { cache: 'no-store' });
    runtimeConfig = res.ok ? await res.json() : null;
  } catch {
    runtimeConfig = null;
  }
  return runtimeConfig;
}

// Lazy-load Gemini SDK only when a key exists; use CDN to avoid bundling
async function getGeminiClient(): Promise<any | null> {
  const cfg = await getRuntimeConfig();
  const key = cfg?.geminiApiKey || (window as any)?.GEMINI_API_KEY;
  if (!key) return null;
  const mod = await import('https://esm.sh/@google/genai@1.13.0');
  const client = new (mod as any).GoogleGenAI({ apiKey: key });
  return { mod, client };
}

// New type for adjustments
type AIAdjustmentSuggestion = {
    adjustments: NonNullable<Photo['adjustments']>;
    enhancementNotes: string;
};

// 1. Auto Enhance Picture
export const getAIAutoAdjustments = async (photoName: string): Promise<AIAdjustmentSuggestion> => {
  const gem = await getGeminiClient();
  if (!gem) {
    return new Promise(resolve => setTimeout(() => resolve({
      adjustments: { brightness: 115, contrast: 120, saturation: 125 },
      enhancementNotes: 'Mock: Increased vibrance and balance for web display.'
    }), MOCK_DELAY));
  }

  const { client } = gem;
  const prompt = {
    text: `Return JSON with keys brightness, contrast, saturation (0-200, 100 no change) and enhancementNotes for photo "${photoName}".`
  };
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [prompt] },
    config: { responseMimeType: 'application/json' }
  });
  const jsonResponse = JSON.parse((response as any).text);
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
  const gem = await getGeminiClient();
  if (!gem) {
    return new Promise(resolve => setTimeout(() => resolve({
      suggestedDescription: 'A sunlit mountain vista under a clear blue sky.',
      enhancementNotes: 'Mock: Shortened and made more evocative.'
    }), MOCK_DELAY));
  }

  const { client } = gem;
  const prompt = {
    text: `Return JSON with keys suggestedDescription and enhancementNotes for a new one-sentence, SEO-friendly description. Name: "${photoName}". Current: "${currentDescription}".`
  };
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [prompt] },
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse((response as any).text) as AIDescriptionSuggestion;
};


// 3. Generate Credits
type AICreditsSuggestion = { author: string; copyright: string; enhancementNotes: string; };

export const getAICredits = async (photoName: string, currentDescription: string): Promise<AICreditsSuggestion> => {
  const gem = await getGeminiClient();
  if (!gem) {
    return new Promise(resolve => setTimeout(() => resolve({
      author: 'Demo User',
      copyright: `© ${new Date().getFullYear()} Demo User. All rights reserved.`,
      enhancementNotes: 'Mock: Assumed ownership for demo.'
    }), MOCK_DELAY));
  }

  const { client } = gem;
  const prompt = {
    text: `Return JSON with keys author, copyright, enhancementNotes based on filename "${photoName}" and description "${currentDescription}".`
  };
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [prompt] },
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse((response as any).text) as AICreditsSuggestion;
};


// 4. Optimize File details
type AIOptimizationSuggestion = Omit<AIEnhancementSuggestion, "suggestedDescription">;

export const getAIOptimization = async (photoName: string, originalFileSize: number): Promise<AIOptimizationSuggestion> => {
  const gem = await getGeminiClient();
  if (!gem) {
    return new Promise(resolve => setTimeout(() => resolve({
      suggestedFileName: `web-optimized-${photoName.toLowerCase().replace(/\s+/g, '-')}.jpg`,
      suggestedWidth: 1920,
      suggestedHeight: 1080,
      suggestedFileSize: Math.round(originalFileSize * 0.4),
      enhancementNotes: 'Mock: Standard 1080p and filename normalization for web.'
    }), MOCK_DELAY));
  }

  const { client } = gem;
  const prompt = {
    text: `Return JSON with keys suggestedFileName, suggestedWidth, suggestedHeight, suggestedFileSize, enhancementNotes for optimizing "${photoName}" (original size ${originalFileSize} bytes).`
  };
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [prompt] },
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse((response as any).text) as AIOptimizationSuggestion;
};
