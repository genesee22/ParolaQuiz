import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import { autoCleanup } from '../tools/chatHandler.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const quizChats = new Map();
const imgQuizChats = new Map();
const wordProcessChats = new Map();

setInterval(() => {
  autoCleanup(quizChats);
  autoCleanup(imgQuizChats);
  autoCleanup(wordProcessChats);
}, 5 * 1000);

export const getQuizChat = async (userId) => {
  if (quizChats.has(userId)) return quizChats.get(userId).chat;

  const chat = await ai.chats.create({
    model: 'gemini-2.0-flash',
    config: {
      systemInstruction: process.env.QUIZ_PROMPT,
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

  quizChats.set(userId, { chat, timestamp: Date.now() });

  return chat;
};

export const getImgQuizChat = async (userId) => {
  if (imgQuizChats.has(userId)) return imgQuizChats.get(userId).chat;

  const chat = await ai.chats.create({
    model: 'gemini-2.0-flash',
    config: {
      systemInstruction: process.env.IMG_QUIZ_PROMPT,
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
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 4,
                  maxItems: 4
                },
                correctAnswer: { type: 'string' }
              },
              required: ['options', 'correctAnswer']
            }
          }
        },
        required: ['title', 'questions']
      }
    }
  });

  imgQuizChats.set(userId, { chat, timestamp: Date.now() });

  return chat;
};

export const getWordProcessChat = async (userId) => {
  if (wordProcessChats.has(userId)) return wordProcessChats.get(userId).chat;

  const chat = await ai.chats.create({
    model: 'gemini-2.0-flash',
    config: {
      systemInstruction: process.env.WORDS_PROCESS_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            language: { type: 'string' },
            languageLevel: { type: 'string' },
            category: { type: 'string' },
            definition: { type: 'string' },
            exampleSentence: { type: 'string' },
          },
          required: ['word', 'language', 'languageLevel', 'category', 'definition'],
        }
      }
    }
  });

  wordProcessChats.set(userId, { chat, timestamp: Date.now() });

  return chat;
};