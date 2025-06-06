import quizModel from '../models/quizModel.js';
import vocabModel from '../models/vocabModel.js';
import { deleteImgQuizChat, deleteQuizChat, deleteVocabChat, getImgQuizChat, getQuizChat, getVocabChat } from '../services/geminiService.js';
import { addWords } from './vocabController.js';

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
    let vocabChat = await getVocabChat(userId);

    let isOverloaded = vocabChat.history.length > 3;
    if (isOverloaded) {
        deleteVocabChat(userId);
        vocabChat = await getVocabChat(userId);
    }

    let fieldWords = await vocabChat.sendMessage({ 
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
        
        let isOverloaded = quizChat.history.length > 3;
        if (isOverloaded) {
            deleteQuizChat(userId);
            quizChat = await getQuizChat(userId);
        }
        
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

        if (settings.type === 'vocabulary') {
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
        
        let isOverloaded = quizChat.history.length > 3;
        if (isOverloaded) {
            deleteImgQuizChat(userId);
            quizChat = await getImgQuizChat(userId);
        }
        
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
        
        if (settings.type === 'vocabulary') {
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

    try {
        const quiz = await quizModel.findByIdAndDelete(quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        const quizWords = await vocabModel.find({ userId: userId, quizIds: quizId });
        if (quizWords.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'Quiz removed successfully. No vocabulary words were linked to this quiz.'
            });
        }

        await vocabModel.updateMany(
            { userId, quizIds: quizId },
            { $pull: { quizIds: quizId } }
        );

        return res.status(200).json({ 
            success: true, 
            message: 'Quiz removed successfully.', 
            'Vocabulary words with removed quizId:': quizWords 
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
            
            const word = await vocabModel.findOne({ 
                userId: userId, 
                word: correctAnswer.charAt(0).toUpperCase() + correctAnswer.slice(1)
            });

            if (quiz.type === 'vocabulary' && word) {

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
    const { userId } = req.body;
    const quizId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        const quiz = await quizModel.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        quiz.share.public = true;
        await quiz.save();

        return res.status(200).json({ 
            success: true,
            message: 'Public access allowed successfully.',
            token: quiz.share.token
        });

    } catch (error) {
        console.error('Error while sharing quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while sharing quiz: ' + error.message });
    }
};

export const accessPublicQuiz = async (req, res) => {
    const token = req.params.token;

    if (!token) {
        return res.status(400).json({ success: false, message: 'Quiz token is required.' });
    }

    try {
        const quiz = await quizModel.findOne({ 'share.token': token });

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }
        if (!quiz.share.public) {
            return res.status(403).json({ success: false, message: "Quiz isn't allowed for public access."});
        }

        return res.status(200).json({ 
            success: true,
            message: 'Public quiz accessed successfully.',
            quiz: quiz
        });

    } catch (error) {
        console.error('Error while sharing quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while sharing quiz: ' + error.message });
    }
};

export const cloneQuiz = async (req, res) => {
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
        if (!quiz.share.public) {
            return res.status(403).json({ success: false, message: "Quiz isn't allowed for public access."});
        }
        if (quiz.userId === userId) {
            return res.status(403).json({ success: false, message: "Can't clone quiz for the same user."});
        }

        const quizClone = new quizModel({
            userId: userId,
            type: quiz.type,
            language: quiz.language,
            title: quiz.title,
            questions: quiz.questions,
        });

        await quizClone.save();

        return res.status(200).json({ 
            success: true,
            message: 'Quiz successfully cloned.',
            quiz: quizClone
        });

    } catch (error) {
        console.error('Error while cloning quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while cloning quiz: ' + error.message });
    }
};