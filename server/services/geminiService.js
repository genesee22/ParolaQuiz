import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const userChats = new Map();

export const getQuizChat = async (userId) => {
    if (userChats.has(userId)) {
        return userChats.get(userId);
    }

    const chat = await ai.chats.create({
      model: "gemini-2.0-flash",
      history: [
        {
          role: "user",
          parts: [{ text: process.env.QUIZ_PROMPT }]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                questions: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                    question: { type: 'string' },
                    options: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 4,
                        maxItems: 4
                    },
                    correctAnswer: { type: 'string' }
                    },
                    required: ['question', 'options', 'correctAnswer']
                }
                }
            },
            required: ['title', 'questions']
        }
      }
    });

    userChats.set(userId, chat);

    return userChats.get(userId);
};

export const deleteQuizChat = (userId) => {
  userChats.delete(userId);
};
