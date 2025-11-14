import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI;

const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.warn("API_KEY environment variable not set. The application might not work as expected.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const generateChatResponse = async (prompt: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "Você é um assistente de IA amigável e criativo, especializado em fornecer fatos rápidos e curiosidades interessantes sobre qualquer tópico em português. Seja conciso e divertido.",
            }
        });
        return response.text;
    } catch(error) {
        console.error("Error generating chat response from Gemini:", error);
        throw new Error("Falha ao gerar resposta do chat.");
    }
};

// Helper function to convert File to Gemini API Part
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// FIX: Export 'generateImageInsights' to fix import error in videoService.ts
export const generateImageInsights = async (imageFile: File, title: string): Promise<{ insights: string; transcript: string }> => {
    try {
        const ai = getAI();
        const imagePart = await fileToGenerativePart(imageFile);
        const textPart = {
            text: `Analise esta imagem com o título "${title}". Forneça insights detalhados sobre o que você vê e gere uma transcrição descritiva.`,
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        insights: {
                            type: Type.STRING,
                            description: "Análise detalhada e insights sobre a imagem."
                        },
                        transcript: {
                            type: Type.STRING,
                            description: "Uma transcrição descritiva do conteúdo da imagem."
                        }
                    },
                    required: ["insights", "transcript"]
                }
            }
        });
        
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);

        return {
            insights: result.insights || "",
            transcript: result.transcript || "",
        };
    } catch(error) {
        console.error("Error generating image insights from Gemini:", error);
        throw new Error("Falha ao gerar insights da imagem.");
    }
};
