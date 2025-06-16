import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import { autoCleanup } from '../tools/chatHandler.js';
import { multipleChoiceSchema, fillInTheBlankSchema, matchingSchema, trueFalseSchema, wordProcessSchema } from '../config/responseSchemas.js';

const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
});

const quizChats = new Map();
const wordProcessChats = new Map();

setInterval(() => {
    autoCleanup(quizChats);
    autoCleanup(wordProcessChats);
}, 5 * 60 * 1000);

export const quizChat = async (userId, style) => {
    if (quizChats.has(userId)) return quizChats.get(userId).chat;

    let responseSchema = {};
    if (style === 'multiple-choice') responseSchema = multipleChoiceSchema;
    if (style === 'fill-in-the-blank') responseSchema = fillInTheBlankSchema;
    if (style === 'matching') responseSchema = matchingSchema;
    if (style === 'true-false') responseSchema = trueFalseSchema;

    const chat = await ai.chats.create({
        model: 'gemini-2.0-flash-001',
        config: {
            systemInstruction: process.env.QUIZ_PROMPT,
            responseMimeType: 'application/json',
            temperature: 0.2,
            responseSchema: responseSchema
        }
    });
    
    quizChats.set(userId, { chat, timestamp: Date.now() });

    return chat;
};

export const wordProcessChat = async (userId) => {
    if (wordProcessChats.has(userId)) return wordProcessChats.get(userId).chat;

    const chat = await ai.chats.create({
        model: 'gemini-2.0-flash',
        config: {
            systemInstruction: process.env.WORDS_PROCESS_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: wordProcessSchema
        }
    });

    wordProcessChats.set(userId, { chat, timestamp: Date.now() });

    return chat;
};