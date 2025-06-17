import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import { autoCleanup } from '../tools/chatHandler.js';
import { multipleChoiceSchema, fillInTheBlankSchema, matchingSchema, trueFalseSchema, wordProcessSchema, mixedSchema } from '../config/responseSchemas.js';

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
    if (quizChats.has(`${style} ${userId}`)) {
        return quizChats.get(`${style} ${userId}`).chat;
    }

    const QUIZ_INIT_PROMPT = process.env.QUIZ_INIT_PROMPT;
    let QUIZ_STYLE_PROMPT = '';
    let responseSchema = null;
    
    switch (style) {
        case 'multiple-choice':
            QUIZ_STYLE_PROMPT = process.env.MULTIPLE_CHOICE_STYLE_PROMPT;
            responseSchema = multipleChoiceSchema;
            break;
        case 'fill-in-the-blank':
            QUIZ_STYLE_PROMPT = process.env.FILL_IN_THE_BLANK_STYLE_PROMPT;
            responseSchema = fillInTheBlankSchema;
            break;
        case 'true-false':
            QUIZ_STYLE_PROMPT = process.env.TRUE_FALSE_STYLE_PROMPT;
            responseSchema = trueFalseSchema;
            break;
        case 'matching':
            QUIZ_STYLE_PROMPT = process.env.MATCHING_STYLE_PROMPT;
            responseSchema = matchingSchema;
            break;
        case 'mixed':
            QUIZ_STYLE_PROMPT = process.env.MIXED_STYLE_PROMPT;
            responseSchema = mixedSchema;
            break;
    }

    if (QUIZ_STYLE_PROMPT === '' || !responseSchema) return null;

    const chat = await ai.chats.create({
        model: 'gemini-2.0-flash-001',
        config: {
            systemInstruction: QUIZ_INIT_PROMPT + QUIZ_STYLE_PROMPT,
            responseMimeType: 'application/json',
            temperature: 0.2,
            responseSchema: responseSchema
        }
    });
    
    quizChats.set(`${style} ${userId}`, { chat, timestamp: Date.now() });

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