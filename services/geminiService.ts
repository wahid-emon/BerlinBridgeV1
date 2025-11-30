import { GoogleGenAI } from "@google/genai";
import { UserProfile, MeetingSpot } from "../types";

// Declare process for TypeScript to avoid linter errors in browser context
// The actual replacement happens at build time by Vite
declare var process: {
  env: {
    API_KEY: string;
  };
};

// Initialize Gemini Client safely
const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey: apiKey });
  } catch (e) {
    console.error("Failed to initialize Gemini Client", e);
  }
} else {
  console.warn("API_KEY is missing. AI features will not work.");
}

// Suggest public meeting spots using Google Maps Grounding
export const getMeetingSuggestions = async (
  district: string,
  user1: UserProfile,
  user2: UserProfile
): Promise<MeetingSpot[]> => {
  if (!ai) {
    return [{
      title: "API Key Missing",
      description: "Please configure your API_KEY in Vercel settings to see AI suggestions.",
    }];
  }

  try {
    const prompt = `
      Suggest 3 specific, safe, and quiet public places (cafes, parks, or community centers) in the Berlin district of ${district} 
      that would be suitable for a conversation between two people.
      One person enjoys: ${user1.interests.join(', ')}.
      The other enjoys: ${user2.interests.join(', ')}.
      Focus on places with a relaxed atmosphere suitable for an elderly person and a student to talk.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const spots: MeetingSpot[] = [];

    // Extract grounding chunks if available (Google Maps Grounding)
    const candidates = response.candidates;
    if (candidates && candidates[0]?.groundingMetadata?.groundingChunks) {
      const chunks = candidates[0].groundingMetadata.groundingChunks;
      
      chunks.forEach((chunk: any) => {
        if (chunk.maps) {
          spots.push({
            title: chunk.maps.title || "Suggested Location",
            address: "View map for details",
            description: "A recommended spot based on your location preferences.",
            url: chunk.maps.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(chunk.maps.title || '')}`
          });
        }
      });
    }

    // Fallback if no specific map data found
    if (spots.length === 0 && response.text) {
        spots.push({
            title: "Gemini Suggestions",
            description: response.text,
            url: ""
        });
    }

    return spots;

  } catch (error) {
    console.error("Error fetching meeting spots:", error);
    return [
      {
        title: "Local Cafe",
        description: "Please check your local maps for a quiet cafe in " + district,
      }
    ];
  }
};

// Generate icebreakers based on shared interests
export const getConversationStarters = async (
  user1: UserProfile,
  user2: UserProfile
): Promise<string[]> => {
  if (!ai) return ["Please set your API Key to generate icebreakers."];

  try {
    const prompt = `
      Generate 5 warm, friendly, and respectful conversation starters for a meeting between:
      1. ${user1.name} (Age: ${user1.age}, Interests: ${user1.interests.join(', ')})
      2. ${user2.name} (Age: ${user2.age}, Interests: ${user2.interests.join(', ')})
      
      The conversation will be in German (or mixed). Provide the starters in German with an English translation in parentheses.
      Keep it simple and suitable for a first meeting in a cafe.
      Return ONLY a JSON array of strings.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return ["Wie geht es Ihnen? (How are you?)"];
    
    return JSON.parse(text) as string[];

  } catch (error) {
    console.error("Error generating icebreakers:", error);
    return [
      "Was machen Sie gerne in Ihrer Freizeit? (What do you like to do in your free time?)",
      "Wie lange wohnen Sie schon in Berlin? (How long have you lived in Berlin?)"
    ];
  }
};