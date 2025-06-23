import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { autoCleanup } from "../helpers/chatHelper.js";
import {
  multipleChoiceSchema,
  fillInTheBlankSchema,
  matchingSchema,
  trueFalseSchema,
  wordProcessSchema,
  mixedSchema,
} from "../config/responseSchemas.js";

interface ChatEntry {
  chat: any;
  timestamp: number;
}

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || "global",
});

const quizChats = new Map<string, ChatEntry>();
const wordProcessChats = new Map<string, ChatEntry>();

setInterval(() => {
  autoCleanup(quizChats);
  autoCleanup(wordProcessChats);
}, 5 * 60 * 1000);

export const quizChat = async (userId: string, style: string): Promise<any | null> => {
  const chatKey = `${style} ${userId}`;

  if (quizChats.has(chatKey)) {
    return quizChats.get(chatKey)?.chat;
  }

  const QUIZ_INIT_PROMPT: string | undefined = process.env.QUIZ_INIT_PROMPT;
  let QUIZ_STYLE_PROMPT: string | undefined = '';
  let responseSchema: any = null;

  switch (style) {
    case "multiple-choice":
      QUIZ_STYLE_PROMPT = process.env.MULTIPLE_CHOICE_STYLE_PROMPT;
      responseSchema = multipleChoiceSchema;
      break;
    case "fill-in-the-blank":
      QUIZ_STYLE_PROMPT = process.env.FILL_IN_THE_BLANK_STYLE_PROMPT;
      responseSchema = fillInTheBlankSchema;
      break;
    case "true-false":
      QUIZ_STYLE_PROMPT = process.env.TRUE_FALSE_STYLE_PROMPT;
      responseSchema = trueFalseSchema;
      break;
    case "matching":
      QUIZ_STYLE_PROMPT = process.env.MATCHING_STYLE_PROMPT;
      responseSchema = matchingSchema;
      break;
    case "mixed":
      QUIZ_STYLE_PROMPT = process.env.MIXED_STYLE_PROMPT;
      responseSchema = mixedSchema;
      break;
    default:
      console.warn(`Unexpected quiz style provided: ${style}`);
      return null;
  }

  if (
    QUIZ_INIT_PROMPT === undefined || QUIZ_INIT_PROMPT === '' ||
    QUIZ_STYLE_PROMPT === undefined || QUIZ_STYLE_PROMPT === '' ||
    !responseSchema
  ) {
    console.error(`Missing required environment prompts or response schema for style: ${style}`);
    return null;
  }

  try {
    const chat = await ai.chats.create({
      model: "gemini-2.0-flash-001",
      config: {
        systemInstruction: QUIZ_INIT_PROMPT + QUIZ_STYLE_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.2,
        responseSchema: responseSchema,
      },
    });

    quizChats.set(chatKey, { chat, timestamp: Date.now() });

    return chat;
  } catch (error) {
    console.error(`Error creating chat session for style ${style}:`, error);
    return null;
  }
};

export const wordProcessChat = async (userId: string): Promise<any | null> => {
  if (wordProcessChats.has(userId)) {
    return wordProcessChats.get(userId)?.chat;
  }

  const WORDS_PROCESS_PROMPT: string | undefined = process.env.WORDS_PROCESS_PROMPT;

  if (WORDS_PROCESS_PROMPT === undefined || WORDS_PROCESS_PROMPT === "") {
    console.error("Missing WORDS_PROCESS_PROMPT environment variable.");
    return null;
  }

  try {
    const chat = await ai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        systemInstruction: WORDS_PROCESS_PROMPT,
        responseMimeType: "application/json",
        responseSchema: wordProcessSchema,
      },
    });

    wordProcessChats.set(userId, { chat, timestamp: Date.now() });

    return chat;
  } catch (error) {
    console.error("Error creating word process chat session:", error);
    return null;
  }
};