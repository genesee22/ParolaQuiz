import { Request, Response } from 'express';
import mongoose from 'mongoose';
import quizModel, { Quiz, Question, Matching } from '../models/quizModel.js';
import wordModel, { Word } from '../models/wordModel.js';
import userModel, { User } from '../models/userModel.js';
import { quizChat } from '../services/gemini.js';
import { redis } from '../config/redis.js';
import { addAiFieldWordsToDB } from 'helpers/wordHelper.js';
import { nanoid } from 'nanoid';

interface QuizFilter {
    userId?: string;
    title?: string;
    type?: 'text' | 'words' | 'grammar';
    createdAt?: Date | string; 
}

interface QuizSettings {
    language: string;
    type: 'text' | 'words' | 'grammar';
    style:
        | "multiple-choice"
        | "fill-in-the-blank"
        | "true-false"
        | "matching"
        | "mixed";
    languageLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    quantity: number;
    questionsLength?: 'short' | 'medium' | 'long';
    optionsLength?: 'short' | 'medium' | 'long';
    matchingsLength?: 'short' | 'medium' | 'long';
    inventedOptions?: boolean;
    explanation?: boolean;
    userNotes?: string;
}

interface GeneratedQuiz {
    title: string;
    questions?: Question[];
    matchings?: Matching[];
}

export const getQuizzes = async (req: Request, res: Response): Promise<void> => {
    const { userId, filter } = req.body as { userId: string, filter?: QuizFilter };

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }

    try {
        const query: QuizFilter = { userId: userId };

        if (filter?.title) query.title = filter.title;
        if (filter?.type) query.type = filter.type;
        if (filter?.createdAt) query.createdAt = filter.createdAt;

        const quizzes: Quiz[] = await quizModel.find(query);

        await Promise.all(
            quizzes.map(async (quiz) => {
                const key = `quiz ${quiz._id?.toString()}`;

                const exists = await redis.exists(key);
                if (!exists) {
                    await redis.set(key, JSON.stringify(quiz), { EX: 3600 });
                }
            })
        );

        if (quizzes.length === 0) {
            res.status(200).json({ success: true, quizzes: [], message: 'No quizzes found.' });
            return;
        }

        res.status(200).json({ success: true, quizzes });
        return;

    } catch (error: any) {
        console.error('Error while fetching quizzes:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching quizzes: ' + error.message });
        return;
    }
};

export const getQuizById = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body as { userId: string };
    const quizId = req.params.id as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!quizId) {
        res.status(400).json({ success: false, message: 'Quiz ID is required.' });
        return;
    }

    const cachedQuiz = await redis.get(`quiz ${quizId}`);
    if (cachedQuiz) {
        res.status(200).json({ success: true, quiz: JSON.parse(cachedQuiz) });
        return;
    }

    try {
        const quiz: Quiz | null = await quizModel.findById(quizId);

        if (!quiz) {
            res.status(404).json({ success: false, message: 'Quiz not found.' });
            return;
        }

        await redis.set(`quiz ${quizId}`, JSON.stringify(quiz), { EX: 3600 }); 

        res.status(200).json({ success: true, quiz: quiz });
        return;

    } catch (error: any) {
        console.error('Error getting quiz by ID:', error);
        res.status(500).json({ success: false, message: 'Internal server error getting quiz by ID: ' + error.message });
        return;
    }
};

export const createDemoQuiz = async (req: Request, res: Response): Promise<void> => {
    const { demoId, settings, data } = req.body as { demoId: string, settings: QuizSettings, data: string };

    if (!settings) {
        res.status(400).json({ success: false, message: 'Settings are required.' });
        return;
    }
    if (!data) {
        res.status(400).json({ success: false, message: 'Data is required.' });
        return;
    }

    try {
        let newDemoId = nanoid(10);
        const chat = await quizChat(demoId ? demoId : newDemoId, settings.style); 

        if (!chat) {
            console.error('Failed to initialize quiz chat session.');
            res.status(500).json({ success: false, message: 'Failed to initialize AI quiz session.' });
            return;
        }

        let chatResponse = await chat.sendMessage({
            message:
                `Language: ${settings.language}\n` +
                `Type: ${settings.type}\n` +
                `Language Level: ${settings.languageLevel}\n` +
                `Quantity: ${settings.quantity}\n` +
                `${settings.questionsLength ? `Questions Length: ${settings.questionsLength}\n` : ''}` +
                `${settings.optionsLength ? `Options Length: ${settings.optionsLength}\n` : ''}` +
                `${settings.matchingsLength ? `Matchings Length: ${settings.matchingsLength}\n` : ''}` +
                `${settings.inventedOptions ? `Invented Options: ${settings.inventedOptions}\n` : ''}` +
                `${settings.explanation ? `Explanation: ${settings.explanation}\n` : ''}` +
                `${settings.userNotes ? `User Notes: ${settings.userNotes}\n` : ''}` +
                `Data: ${data}`
        });

        const generatedQuiz: GeneratedQuiz = JSON.parse(chatResponse.text);

        res.status(201).json({
            success: true,
            message: 'Quiz successfully created.',
            quiz: generatedQuiz,
            chat: chat.history,
            chatLength: chat.history.length,
            chatId: demoId ? demoId : newDemoId
        });
        return;

    } catch (error: any) {
        console.error('Error while creating demo quiz:', error);
        res.status(500).json({ success: false, message: 'Internal server error while creating demo quiz: ' + error.message });
        return;
    }
};

export const createQuiz = async (req: Request, res: Response): Promise<void> => {
    const { userId, settings, data } = req.body as { userId: string, settings: QuizSettings, data: string };

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!settings) {
        res.status(400).json({ success: false, message: 'Settings are required.' });
        return;
    }
    if (!data) {
        res.status(400).json({ success: false, message: 'Data is required.' });
        return;
    }

    try {
        const chat = await quizChat(userId, settings.style); 

        if (!chat) {
            console.error('Failed to initialize quiz chat session.');
            res.status(500).json({ success: false, message: 'Failed to initialize AI quiz session.' });
            return;
        }

        let chatResponse = await chat.sendMessage({
            message:
                `Language: ${settings.language}\n` +
                `Type: ${settings.type}\n` +
                `Language Level: ${settings.languageLevel}\n` +
                `Quantity: ${settings.quantity}\n` +
                `${settings.questionsLength ? `Questions Length: ${settings.questionsLength}\n` : ''}` +
                `${settings.optionsLength ? `Options Length: ${settings.optionsLength}\n` : ''}` +
                `${settings.matchingsLength ? `Matchings Length: ${settings.matchingsLength}\n` : ''}` +
                `${settings.inventedOptions ? `Invented Options: ${settings.inventedOptions}\n` : ''}` +
                `${settings.explanation ? `Explanation: ${settings.explanation}\n` : ''}` +
                `${settings.userNotes ? `User Notes: ${settings.userNotes}\n` : ''}` +
                `Data: ${data}`
        });

        const generatedQuiz: GeneratedQuiz = JSON.parse(chatResponse.text);

        const quiz: Quiz = new quizModel({
            userId: userId,
            type: settings.type,
            style: settings.style,
            language: settings.language,
            title: generatedQuiz.title,
        });

        if (!quiz.title) quiz.title = quiz.createdAt.toLocaleString();

        if (settings.style === 'matching') quiz.matchings = generatedQuiz.matchings;
        else quiz.questions = generatedQuiz.questions;

        await quiz.save();

        await redis.set(`quiz ${quiz._id}`, JSON.stringify(quiz), { EX: 3600 });

        if (settings.type === 'words') {
            await addAiFieldWordsToDB(userId, settings.language, data, quiz._id as  mongoose.Types.ObjectId);
        }

        res.status(201).json({
            success: true,
            message: 'Quiz successfully created.',
            quiz: quiz,
            quizChat: chat.history
        });
        return;

    } catch (error: any) {
        console.error('Error while creating quiz:', error);
        res.status(500).json({ success: false, message: 'Internal server error while creating quiz: ' + error.message });
        return;
    }
};

export const removeQuiz = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body as { userId: string };
    const quizId = req.params.id as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!quizId) {
        res.status(400).json({ success: false, message: 'Quiz ID is required.' });
        return;
    }

    try {
        const quiz: Quiz | null = await quizModel.findOneAndDelete({ _id: quizId, userId: userId });

        if (!quiz) {
            const exists = await quizModel.findById(quizId);
            if (exists) {
                res.status(403).json({ success: false, message: 'Forbidden: You do not own this quiz.' });
                return;
            }
            res.status(404).json({ success: false, message: 'Quiz not found.' });
            return;
        }

        const quizWords: Word[] = await wordModel.find({ userId: userId, quizIds: quizId });

        if (quizWords.length > 0) {
            await wordModel.updateMany(
                { userId: userId, quizIds: quizId },
                { $pull: { quizIds: quizId } }
            );
        }

        await redis.del(`quiz ${quizId}`);

        res.status(200).json({
            success: true,
            message: 'Quiz removed successfully.',
            'Words with removed quizId:': quizWords.length > 0 ? quizWords : 'No words were linked to this quiz.'
        });

    } catch (error: any) {
        console.error('Error while removing quiz:', error);
        res.status(500).json({ success: false, message: 'Internal server error while removing quiz: ' + error.message });
        return;
    }
};

export const updateQuiz = async (req: Request, res: Response): Promise<void> => {
    const { userId, data } = req.body;
    const quizId = req.params.id as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!data) {
        res.status(400).json({ success: false, message: 'New data is required.' });
        return;
    }
    if (!quizId) {
        res.status(400).json({ success: false, message: 'Quiz ID is required.' });
        return;
    }

    try {
        const quiz: Quiz | null = await quizModel.findOne({ _id: quizId, userId: userId });

        if (!quiz) {
            const exists = await quizModel.findById(quizId);
            if (exists) {
                res.status(403).json({ success: false, message: 'Forbidden: You do not own this quiz.' });
                return;
            }
            res.status(404).json({ success: false, message: 'Quiz not found.' });
            return;
        }

        if (!data.type) quiz.type = data.type;
        if (!data.language) quiz.language = data.language;
        if (!data.title) quiz.title = data.title;
        if (!data.questions) quiz.questions = data.questions;
        if (!data.matchings) quiz.matchings = data.matchings;

        await quiz.save();
        await redis.set(`quiz ${quizId}`, JSON.stringify(quiz), { EX: 3600 }); // Update cache

        res.status(200).json({ success: true, message: 'Quiz updated successfully.', updatedQuiz: quiz });
        return;

    } catch (error: any) {
        console.error('Error while updating quiz:', error);
        res.status(500).json({ success: false, message: 'Internal server error while updating quiz: ' + error.message });
        return;
    }
};

export const saveAnswers = async (req: Request, res: Response): Promise<void> => {
    const { userId, answers } = req.body as { userId: string, answers: string[] | { a: string, b: string }[] };
    const quizId = req.params.id as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!answers) {
        res.status(400).json({ success: false, message: 'User answers are required.' });
        return;
    }
    if (!quizId) {
        res.status(400).json({ success: false, message: 'Quiz ID is required.' });
        return;
    }

    try {
        const quiz: Quiz | null = await quizModel.findById(quizId);

        if (!quiz) {
            res.status(404).json({ success: false, message: 'Quiz not found.' });
            return;
        }

        let totalCorrect = 0;

        if (quiz.style === 'matching' && quiz.matchings) {
            const mAnswers = answers as { a: string, b: string }[];
            await Promise.all(
                quiz.matchings.map(async (matching, i) => {
                    if (matching.a === mAnswers[i].a && matching.b === mAnswers[i].b) {
                        matching.correctCount++;
                        totalCorrect++;
                    }

                    if (quiz.type === 'words' && matching.a) {
                        const wordText = matching.a.charAt(0).toUpperCase() + matching.a.slice(1);
                        const word: Word | null = await wordModel.findOne({
                            userId: userId,
                            word: wordText
                        });

                        if (word) {
                            if (matching.correctCount === 0) word.knowledge = 'Hard Word';
                            else if (matching.correctCount === 1) word.knowledge = 'Almost Know';
                            else word.knowledge = 'Know';
                            await word.save();
                        }
                    }
                })
            );
        } else if (quiz.questions) {
            await Promise.all(
                quiz.questions.map(async (question, i) => {
                    const correctAnswer = question.correctAnswer;

                    if (correctAnswer === answers[i]) {
                        question.correctCount++;
                        totalCorrect++;
                    }

                    if (quiz.type === 'words' && correctAnswer) { 
                        const wordText = correctAnswer.charAt(0).toUpperCase() + correctAnswer.slice(1);
                        const word: Word | null = await wordModel.findOne({
                            userId: userId,
                            word: wordText
                        });

                        if (word) {
                            if (question.correctCount === 0) word.knowledge = 'Hard Word';
                            else if (question.correctCount === 1) word.knowledge = 'Almost Know';
                            else word.knowledge = 'Know';
                            await word.save();
                        }
                    }
                })
            );
        }

        quiz.userAnswers = answers;
        quiz.timesCompleted++;

        await quiz.save();
        await redis.set(`quiz ${quizId}`, JSON.stringify(quiz), { EX: 3600 });

        res.status(200).json({
            success: true,
            message: 'Answers saved successfully.',
            correctAnswers: totalCorrect,
            outOf: quiz.questions?.length || quiz.matchings?.length || 0,
        });
        return;

    } catch (error: any) {
        console.error('Error while saving answers:', error);
        res.status(500).json({ success: false, message: 'Internal server error while saving answers: ' + error.message });
        return;
    }
};

export const shareQuiz = async (req: Request, res: Response): Promise<void> => {
    const { userId, email } = req.body as { userId: string, email: string };
    const quizId = req.params.id as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!quizId) {
        res.status(400).json({ success: false, message: 'Quiz ID is required.' });
        return;
    }

    try {
        const quiz: Quiz | null = await quizModel.findById(quizId);

        if (!quiz) {
            res.status(404).json({ success: false, message: 'Quiz not found.' });
            return;
        }

        if (quiz.userId.toString() !== userId) {
            res.status(403).json({ success: false, message: 'Forbidden: You can only share quizzes you own.' });
            return;
        }

        if (email) {
            const user: User | null = await userModel.findOne({ email });
            if (!user) {
                res.status(404).json({ success: false, message: 'User with provided email not found.' });
                return;
            }

            if (!quiz.share.userIds.some(id => id.toString() === user._id?.toString())) {
                quiz.share.userIds.push(user._id as mongoose.Types.ObjectId);
            }
        }
        else {
            quiz.share.public = true;
        }

        await quiz.save();
        await redis.set(`quiz ${quizId}`, JSON.stringify(quiz), { EX: 3600 });

        res.status(200).json({
            success: true,
            message: 'Quiz shared successfully.',
            token: quiz.share.token
        });
        return;

    } catch (error: any) {
        console.error('Error while sharing quiz:', error);
        res.status(500).json({ success: false, message: 'Internal server error while sharing quiz: ' + error.message });
        return;
    }
};

export const unshareQuiz = async (req: Request, res: Response): Promise<void> => {
    const { userId, email } = req.body as { userId: string, email: string };
    const quizId = req.params.id as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!quizId) {
        res.status(400).json({ success: false, message: 'Quiz ID is required.' });
        return;
    }

    try {
        const quiz: Quiz | null = await quizModel.findOne({ _id: quizId, userId: userId });

        if (!quiz) {
            const exists = await quizModel.findById(quizId);
            if (exists) {
                res.status(403).json({ success: false, message: 'Forbidden: You can only unshare quizzes you own.' });
                return;
            }
            res.status(404).json({ success: false, message: 'Quiz not found.' });
            return;
        }

        if (email) {
            const user: User | null = await userModel.findOne({ email });
            if (user) {
                quiz.share.userIds = quiz.share.userIds.filter(id => id.toString() !== user._id?.toString());
            } else {
                res.status(404).json({ success: false, message: 'User with provided email not found to unshare from.' });
                return;
            }

        } else {
            quiz.share.userIds = [];
            quiz.share.public = false;
        }

        await quiz.save();
        await redis.set(`quiz ${quizId}`, JSON.stringify(quiz), { EX: 3600 });

        res.status(200).json({
            success: true,
            message: 'Quiz unshared successfully.',
        });
        return;

    } catch (error: any) {
        console.error('Error while unsharing quiz:', error);
        res.status(500).json({ success: false, message: 'Internal server error while unsharing quiz: ' + error.message });
        return;
    }
};

export const getSharedQuiz = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body as { userId: string };
    const token = req.params.token as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!token) {
        res.status(400).json({ success: false, message: 'Quiz token is required.' });
        return;
    }

    try {
        const quiz: Quiz | null = await quizModel.findOne({ 'share.token': token });

        if (!quiz) {
            res.status(404).json({ success: false, message: 'Quiz not found or invalid token.' });
            return;
        }

        if (quiz.share.public) {
            res.status(200).json({ success: true, quiz });
            return;
        }

        const hasAccess = quiz.share.userIds.some(id => id.toString() === userId.toString());
        if (hasAccess) {
            res.status(200).json({ success: true, quiz });
            return;
        }

        const isCreator = quiz.userId.toString() === userId.toString();
        if (isCreator) {
            res.status(200).json({ success: true, quiz });
            return;
        }

        res.status(403).json({ success: false, message: 'Access forbidden: You do not have permission to view this quiz.' });
        return;

    } catch (error: any) {
        console.error('Error while getting shared quiz:', error);
        res.status(500).json({ success: false, message: 'Internal server error while getting shared quiz: ' + error.message });
        return;
    }
};

export const cloneQuiz = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body as { userId: string };
    const quizId = req.params.id as string;

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }
    if (!quizId) {
        res.status(400).json({ success: false, message: 'Quiz ID is required.' });
        return;
    }

    try {
        const quiz: Quiz | null = await quizModel.findById(quizId);

        if (!quiz) {
            res.status(404).json({ success: false, message: 'Quiz not found.' });
            return;
        }

        const isCreator = quiz.userId.toString() === userId.toString();
        if (isCreator) {
            res.status(403).json({ success: false, message: "Can't clone a quiz you already own." });
            return;
        }

        const hasAccess = quiz.share.userIds.some(id => id.toString() === userId.toString()) || quiz.share.public;

        if (hasAccess) {
            const creator: User | null = await userModel.findById(quiz.userId);

            const quizClone: Quiz = new quizModel({
                userId: userId,
                type: quiz.type,
                style: quiz.style,
                language: quiz.language,
                title: quiz.title + ` (${creator?.name})`,
                questions: quiz.questions?.map(q => ({ ...q, correctCount: 0 })),
                matchings: quiz.matchings?.map(m => ({ ...m, correctCount: 0 })), 
            });

            await quizClone.save();

            res.status(200).json({
                success: true,
                message: 'Quiz successfully cloned.',
                quiz: quizClone
            });
            return;
        }

        res.status(403).json({ success: false, message: 'Access forbidden: You do not have permission to clone this quiz.' });
        return;

    } catch (error: any) {
        console.error('Error while cloning quiz:', error);
        res.status(500).json({ success: false, message: 'Internal server error while cloning quiz: ' + error.message });
        return;
    }
};