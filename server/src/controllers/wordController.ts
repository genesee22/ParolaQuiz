import { Request, Response } from 'express';
import wordModel, { Word } from "../models/wordModel.js";
import { addAiFieldWordsToDB } from 'helpers/wordHelper.js';
import { redis } from 'config/redis.js';

interface WordFilter {
    userId?: string;
    word?: string;
    language?: string;
    languageLevel?: string;
    category?: string;
}

export const getWords = async (req: Request, res: Response): Promise<void> => {
    const { userId, filter } = req.body as { userId: string, filter?: WordFilter };

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }

    try {
        const query: WordFilter = { userId: userId };

        if (filter?.language) query.language = filter.language;
        if (filter?.languageLevel) query.languageLevel = filter.languageLevel;
        if (filter?.category) query.category = filter.category;

        const cachedWords = await redis.get(`words ${userId}`);
        if (cachedWords) {
            const words: Word[] = JSON.parse(cachedWords);
            res.status(200).json({ success: true, words, message: 'Words fetched from cache.' });
            return;
        }

        const words: Word[] = await wordModel.find(query);

        if (words.length === 0) {
            res.status(404).json({ success: false, message: 'No words found matching the criteria.' });
            return;
        }

        await Promise.all(
            words.map(async (word) => {
                const key = `word ${word._id?.toString()}`;

                const exists = await redis.exists(key);
                if (!exists) {
                    await redis.set(key, JSON.stringify(word), { EX: 3600 });
                }
            })
        );

        res.status(200).json({ success: true, words });
        return;

    } catch (error: any) {
        console.error('Error while getting words:', error);
        res.status(500).json({ success: false, message: 'Internal server error while getting words: ' + error.message });
        return;
    }
};

export const getWordById = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body as { userId: string };
    const wordId = req.params.id as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!wordId) {
        res.status(400).json({ success: false, message: 'Word ID is required.' });
        return;
    }

    const cachedWord = await redis.get(`word ${wordId}`);
    if (cachedWord) {
        res.status(200).json({ success: true, quiz: JSON.parse(cachedWord) });
        return;
    }
    
    try {
        const word = await wordModel.findOne({ _id: wordId, userId: userId });

        if (!word) {
            res.status(404).json({ success: false, message: 'Word not found or not authorized to access.' });
            return;
        }
        await redis.set(`word ${wordId}`, JSON.stringify(word));

        res.status(200).json({ success: true, word });
        return;

    } catch (error: any) {
        console.error('Error while getting word by ID:', error);
        res.status(500).json({ success: false, message: 'Internal server error while getting word: ' + error.message });
        return;
    }
};

export const addWord = async (req: Request, res: Response): Promise<void> => {
    const { userId, newWord } = req.body as { userId: string, newWord: Word }; 

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!newWord || !newWord.word) {
        res.status(400).json({ success: false, message: 'New word data with word field is required.' });
        return;
    }

    try {
        const existingWord = await wordModel.findOne({ userId: userId, word: newWord.word });

        if (existingWord) {
            res.status(409).json({ success: false, message: 'Word already exists.' });
            return;
        }

        const word: Word = new wordModel({
            userId: userId,
            word: newWord.word,
            languageLevel: newWord.languageLevel,
            category: newWord.category,
            definition: newWord.definition,
            exampleSentence: newWord.exampleSentence,
            notes: newWord.notes,
        });

        await word.save();

        res.status(201).json({ success: true, message: 'New word added successfully.', word });
        return;

    } catch (error: any) {
        console.error('Error while adding new word:', error);
        res.status(500).json({ success: false, message: 'Internal server error while adding new word: ' + error.message });
        return;
    }
};

export const addAiFieldWords = async (req: Request, res: Response): Promise<void> => {
    const { userId, newWords, language } = req.body as { userId: string, newWords: string, language: string };

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!newWords) {
        res.status(400).json({ success: false, message: 'New words are required.' });
        return;
    }
    if (!language) {
        res.status(400).json({ success: false, message: 'Language is required.' });
        return;
    }

    try {
        const result = await addAiFieldWordsToDB(userId, language, newWords);
        const { addedWords, chat } = result;

        res.status(201).json({
            success: true,
            message: 'AI field words added successfully.',
            aiFieldWords: addedWords,
            wordProcessChat: chat.history
        });
        return;
        
    } catch (error: any) {
        console.error('Error while adding AI field words:', error);
        res.status(500).json({ success: false, message: 'Internal server error while adding AI field words: ' + error.message });
        return;
    }
};

export const removeWord = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body as { userId: string };
    const wordId = req.params.id as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }

    try {
        const word = await wordModel.findByIdAndDelete(wordId);

        if (!word) {
            res.status(404).json({ success: false, message: 'Word not found.' });
            return;
        }

        res.status(200).json({ success: true, message: 'Word removed successfully.' });
        return;

    } catch (error: any) {
        console.error('Error while removing word:', error);
        res.status(500).json({ success: false, message: 'Internal server error while removing word: ' + error.message });
        return;
    }
};

export const updateWord = async (req: Request, res: Response): Promise<void> => {
    const { userId, newData } = req.body as { userId: string, newData: Partial<Word> };
    const wordId = req.params.id as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!newData) {
        res.status(400).json({ success: false, message: 'New data is required.' });
        return;
    }

    try {
        const word = await wordModel.findOneAndUpdate(
            { _id: wordId, userId: userId },
            { $set: newData },
            { new: true, runValidators: true }
        );

        if (!word) {
            res.status(404).json({ success: false, message: 'Word not found.' });
            return;
        }

        await word.save();

        res.status(200).json({ success: true, message: 'Word updated successfully.', word });
        return;

    } catch (error: any) {
        console.error('Error while updating word:', error);
        res.status(500).json({ success: false, message: 'Internal server error while updating word: ' + error.message });
        return;
    }
};
