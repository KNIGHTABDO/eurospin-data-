import { GoogleGenAI } from "@google/genai";
import { BodyRegion, MRISequence } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchMRIExplanation = async (
  region: BodyRegion,
  sequence: MRISequence
): Promise<string> => {
  try {
    const prompt = `
      You are a world-class MRI Physics Professor for medical students.
      Explain the appearance of the ${region} on a ${sequence} MRI scan.
      
      Key points to cover strictly:
      1. Physics: Why tissues look bright (hyperintense) vs dark (hypointense) in this specific sequence.
      2. Anatomy: Mention 2-3 key structures in the ${region} and how they appear.
      3. Clinical utility: Why choose this sequence for this region? (e.g., "Good for inflammation", "Good for anatomy").
      
      Format: Use Markdown. Keep it concise (under 150 words). Use bullet points.
      Be accurate with T1/T2 relaxation concepts.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Analysis currently unavailable.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to retrieve AI tutor analysis. Please check your API key.";
  }
};
