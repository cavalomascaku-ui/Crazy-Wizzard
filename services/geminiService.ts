import { GoogleGenAI } from "@google/genai";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
// Assume the API_KEY environment variable is pre-configured and valid.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDarkWisdom = async (): Promise<string> => {
  try {
    // Basic Text Tasks: 'gemini-3-flash-preview' is the appropriate model for this prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Gere uma profecia curta e críptica de horror cósmico ou sabedoria adequada para um menu de jogo roguelike. Mantenha menos de 15 palavras. Tema de fantasia sombria e alto contraste. Responda em Português do Brasil.",
      config: {
        // Disabling thinking budget for low-latency menu content generation.
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    // The GenerateContentResponse object features a text property (not a method).
    return response.text?.trim() || "As sombras sussurram...";
  } catch (error) {
    console.error("Failed to fetch wisdom:", error);
    return "A conexão com o vazio foi cortada.";
  }
};