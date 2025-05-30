import { GoogleGenAI } from '@google/genai';
import vocabModel from '../models/vocabModel.js';
import 'dotenv/config';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const quizChats = new Map();
const vocabularyChats = new Map();

export const getQuizChat = async (userId) => {
  if (quizChats.has(userId)) return quizChats.get(userId);

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

  quizChats.set(userId, chat);

  return quizChats.get(userId);
};

export const deleteQuizChat = (userId) => { quizChats.delete(userId) };

export const getVocabChat = async (userId) => {
  if (vocabularyChats.has(userId)) return vocabularyChats.get(userId);

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
          },
          required: ['word', 'language', 'languageLevel', 'category', 'definition'],
        }
      }
    }
  });

  vocabularyChats.set(userId, chat);

  return vocabularyChats.get(userId);

};

export const deleteVocabChat = (userId) => { vocabularyChats.delete(userId) };
