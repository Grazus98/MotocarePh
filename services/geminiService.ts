
import { GoogleGenAI } from "@google/genai";
import { MotorbikeState } from "../types";

export const getMaintenanceAdvice = async (state: MotorbikeState): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Act as a world-class professional motorcycle mechanic.
    The user's current odometer is ${state.currentOdo} km.
    Here is their current maintenance status:
    ${state.maintenanceItems.map(item => `- ${item.name}: Last serviced at ${item.lastServiceOdo}km (${item.description})`).join('\n')}

    Please provide concise, professional, and actionable advice in English.
    Focus on the most critical maintenance items based on the current mileage.
    Use professional yet encouraging tone.
    Keep the response under 150 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Ride safely! Perform regular checks to ensure your motorcycle remains in peak condition.";
  } catch (error) {
    console.error("AI Advice Error:", error);
    return "Our expert mechanic is currently unavailable. Please ensure your oil and tire pressure are checked before your next ride. Ride safe!";
  }
};
