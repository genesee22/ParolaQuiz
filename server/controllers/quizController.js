import quizModel from '../models/quizModel.js';
import wordModel from '../models/wordModel.js';
import userModel from '../models/userModel.js';
import { getQuizChat, getImgQuizChat, getWordProcessChat } from '../services/gemini.js';
import { addWords } from './wordController.js';

export const getQuizzes = async (req, res) => {
    const { userId, filter } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        const query = { userId };

        if (filter?.title) query.title = filter.title;
        if (filter?.type) query.type = filter.type;
        if (filter?.date) query.createdAt = filter.date;

        const quizzes = await quizModel.find(query);

        if (quizzes.length === 0) {
            return res.status(200).json({ success: true, quizzes: [], message: 'No quizzes found.' });
        }

        return res.status(200).json({ success: true, quizzes });

    } catch (error) {
        console.error('Error while removing quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while removing quiz: ' + error.message });
    }
};

export const getQuizById = async (req, res) => {
    const { userId } = req.body;
    const quizId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!quizId) {
        return res.status(400).json({ success: false, message: 'Quiz ID is required.' });
    }

    try {
        const quiz = await quizModel.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        return res.status(200).json({ 
            success: true, 
            quiz: quiz
        });
        
    } catch (error) {
        console.error('Error getting quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error getting quiz: ' + error.message });
    }
};

const addAiFieldWords = async (userId, quizId, language, words) => {
    let wordProcessChat = await getWordProcessChat(userId);

    let fieldWords = await wordProcessChat.sendMessage({ 
        message: `${language} words: ${words}`
    });

    fieldWords = JSON.parse(fieldWords.text);

    addWords(fieldWords, userId, quizId);
};

export const createQuiz = async (req, res) => {
    const { userId, settings, data } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!settings) {
        return res.status(400).json({ success: false, message: 'Settings are required.' });
    }
    if (!data) {
        return res.status(400).json({ success: false, message: 'Data is required.' });
    }

    try {
        let quizChat = await getQuizChat(userId);
        
        let generatedQuiz = await quizChat.sendMessage({
            message: `${settings.language} ${settings.type}, ${settings.languageLevel} level, ${settings.style} style${settings.questions ? `, ${settings.questions} questions` : ''}: ${data}`
        });
        generatedQuiz = JSON.parse(generatedQuiz.text);

        const quiz = new quizModel({
            userId: userId,
            type: settings.type,
            language: settings.language,
            title: generatedQuiz.title,
            questions: generatedQuiz.questions,
        });

        if (quiz.title === '') quiz.title = quiz.createdAt.toLocaleString();

        await quiz.save();

        if (settings.type === 'words') {
            addAiFieldWords(userId, quiz._id, settings.language, data);
        }
        
        return res.status(201).json({ 
            success: true, 
            message: 'Quiz successfully created.', 
            quiz: quiz,
            quizChat: quizChat.history
        });

    } catch (error) {
        console.error('Error while creating quiz:', error);        
        return res.status(500).json({ success: false, message: 'Internal server error while creating quiz: ' + error.message });
    }
};

export const createImgQuiz = async (req, res) => {
    const { userId, settings, data } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!settings) {
        return res.status(400).json({ success: false, message: 'Settings are required.' });
    }
    if (!data) {
        return res.status(400).json({ success: false, message: 'Data is required.' });
    }

    try {
        let quizChat = await getImgQuizChat(userId);
        
        let generatedQuiz = await quizChat.sendMessage({
            message: `${settings.language} words: ${data}`
        });
        generatedQuiz = JSON.parse(generatedQuiz.text);

        const quiz = new quizModel({
            userId: userId,
            type: 'image',
            language: settings.language,
            title: generatedQuiz.title,
            questions: generatedQuiz.questions,
        });

        if (quiz.title === '') quiz.title = quiz.createdAt.toLocaleString();

        await quiz.save();
        
        if (settings.type === 'words') {
            addAiFieldWords(userId, quiz._id, settings.language, data);
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Image based quiz successfully created.', 
            quiz: quiz,
            quizChat: quizChat.history
        });

    } catch (error) {
        console.error('Error while creating image based quiz:', error);        
        return res.status(500).json({ success: false, message: 'Internal server error while creating image based quiz: ' + error.message });
    }
};

export const removeQuiz = async (req, res) => {
    const { userId } = req.body;
    const quizId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!quizId) {
        return res.status(400).json({ success: false, message: 'Quiz ID is required.' });
    }

    try {
        const quiz = await quizModel.findByIdAndDelete(quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        const quizWords = await wordModel.find({ userId: userId, quizIds: quizId });
        if (quizWords.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'Quiz removed successfully. No words were linked to this quiz.'
            });
        }

        await wordModel.updateMany(
            { userId, quizIds: quizId },
            { $pull: { quizIds: quizId } }
        );

        return res.status(200).json({ 
            success: true, 
            message: 'Quiz removed successfully.', 
            'words words with removed quizId:': quizWords 
        });
        
    } catch (error) {
        console.error('Error while removing quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while removing quiz: ' + error.message });
    }
};

export const updateQuiz = async (req, res) => {
    const { userId, data } = req.body;
    const quizId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!data) {
        return res.status(400).json({ success: false, message: 'New data is required.' });
    }
    if (!quizId) {
        return res.status(400).json({ success: false, message: 'Quiz ID is required.' });
    }

    try {
        const quiz = await quizModel.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        if (data.type) quiz.type = data.type;
        if (data.language) quiz.language = data.language;
        if (data.title) quiz.title = data.title;
        if (data.questions) quiz.questions = data.questions;

        await quiz.save();

        return res.status(200).json({ success: true, message: 'Quiz updated successfully.', updatedQuiz: quiz });
        
    } catch (error) {
        console.error('Error while updating quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while updating quiz: ' + error.message });
    }
};

export const saveAnswers = async (req, res) => {
    const { userId, answers } = req.body;
    const quizId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!answers) {
        return res.status(400).json({ success: false, message: 'User answers are required.' });
    }
    if (!quizId) {
        return res.status(400).json({ success: false, message: 'Quiz ID is required.' });
    }

    try {
        const quiz = await quizModel.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        let totalCorrect = 0;

        quiz.questions.map(async (question, i) => {
            const correctAnswer = question.correctAnswer;

            if (correctAnswer === answers[i]) {
                question.correctCount++;
                totalCorrect++;
            }
            
            const word = await wordModel.findOne({ 
                userId: userId, 
                word: correctAnswer.charAt(0).toUpperCase() + correctAnswer.slice(1)
            });

            if (quiz.type === 'words' && word) {

                if (question.correctCount === 0) word.knowledge = 'Hard Word';
                else if (question.correctCount === 1) word.knowledge = 'Almost Know';
                else word.knowledge = 'Know';

                await word.save();
            }

        });
        
        quiz.userAnswers = answers;
        quiz.timesCompleted++;

        await quiz.save();

        return res.status(200).json({ 
            success: true,
            message: 'Answers saved successfully.',
            correctAnswers: totalCorrect,
            questions: quiz.questions.length,
        });
        
    } catch (error) {
        console.error('Error while saving answers:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while saving answers: ' + error.message });
    }
};

export const shareQuiz = async (req, res) => {
    const { userId, email } = req.body;
    const quizId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!quizId) {
        return res.status(400).json({ success: false, message: 'Quiz ID is required.' });
    }

    try {
        const quiz = await quizModel.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }
        if (email) {
            const user = await userModel.findOne({ email });
            quiz.share.userIds.push(user._id);
        }
        else quiz.share.public = true;

        await quiz.save();

        return res.status(200).json({ 
            success: true,
            message: 'Quiz shared successfully.',
            token: quiz.share.token
        });

    } catch (error) {
        console.error('Error while sharing quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while sharing quiz: ' + error.message });
    }
};

export const unshareQuiz = async (req, res) => {
    const { userId, email } = req.body;
    const quizId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!quizId) {
        return res.status(400).json({ success: false, message: 'Quiz ID is required.' });
    }

    try {
        const quiz = await quizModel.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        const user = await userModel.findOne({ email });

        if (user) quiz.share.userIds.pull(user._id);
        else quiz.share.userIds = [];
        quiz.share.public = false;

        await quiz.save();

        return res.status(200).json({ 
            success: true,
            message: 'Quiz unshared successfully.',
        });

    } catch (error) {
        console.error('Error while unsharing quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while unsharing quiz: ' + error.message });
    }
};

export const getSharedQuiz = async (req, res) => {
    const { userId } = req.body;
    const token = req.params.token;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!token) {
        return res.status(400).json({ success: false, message: 'Quiz token is required.' });
    }

    try {
        const quiz = await quizModel.findOne({ 'share.token': token });

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        if (quiz.share.public) {
            return res.status(200).json({ success: true, quiz });
        }
        
        const hasAccess = userId && quiz.share.userIds.some(id => id.toString() === userId.toString());
        if (hasAccess) {
            return res.status(200).json({ success: true, quiz });
        }
        const isCreator = userId && userId.toString() === quiz.userId.toString();
        if (isCreator) {
            return res.status(200).json({ success: true, quiz });
        }

        return res.status(403).json({ success: false, message: 'Access forbidden.' });

    } catch (error) {
        console.error('Error while sharing quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while sharing quiz: ' + error.message });
    }
};

export const cloneQuiz = async (req, res) => {
    const { userId } = req.body;
    const quizId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!quizId) {
        return res.status(400).json({ success: false, message: 'Quiz ID is required.' });
    }

    try {
        const quiz = await quizModel.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        const isCreator = userId && userId.toString() === quiz.userId.toString();
        if (isCreator) {
            return res.status(403).json({ success: false, message: "Can't clone quiz created by the same user." });
        }

        const hasAccess = userId && quiz.share.userIds.some(id => id.toString() === userId.toString());
        if (hasAccess || quiz.share.public) {
            const quizClone = new quizModel({
                userId: userId,
                type: quiz.type,
                language: quiz.language,
                title: quiz.title,
                questions: quiz.questions,
            });

            await quizClone.save();

            if (quizClone.type === 'words') {
                const words = [];

                quizClone.questions.map(async (question, i) => {
                    words.push(question.correctAnswer);
                });

                addAiFieldWords(userId, quizClone._id, quizClone.language, words);
            }

            return res.status(200).json({
                success: true,
                message: 'Quiz successfully cloned.',
                quiz: quizClone
            });
        }

        return res.status(403).json({ success: false, message: 'Access forbidden.' });

    } catch (error) {
        console.error('Error while cloning quiz:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while cloning quiz: ' + error.message
        });
    }
};
