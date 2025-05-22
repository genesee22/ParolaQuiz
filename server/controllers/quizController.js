import quizModel from '../models/quizModel.js';

export const createQuiz = async (req, res) => {
    const { userId, userContent } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!userContent) {
        return res.status(400).json({ success: false, message: 'User content is required.' });
    }

    try {
        const quiz = new quizModel({
            user: userId,
            title: 'Test Quiz',
            questions: [{
                question: 'Test question',
                options: ['Test answer'],       
                correctAnswer: 'Test answer',
            }]
        });

        await quiz.save(); 

        return res.status(201).json({ success: true, message: 'Quiz successfully created', quiz }); 

    } catch (error) {
        console.error('Error while creating quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while creating quiz: ' + error.message });
    }
};

export const removeQuiz = async (req, res) => {
    const userId = req.body;
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

        return res.status(200).json({ success: true, message: 'Quiz removed successfully.' });
        
    } catch (error) {
        console.error('Error while removing quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while removing quiz: ' + error.message });
    }
};

export const updateQuiz = async (req, res) => {
    const { userId, newData } = req.body;
    const quizId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!quizId) {
        return res.status(400).json({ success: false, message: 'Quiz ID is required.' });
    }
    if (!newData) {
        return res.status(400).json({ success: false, message: 'New data is required.' });
    }

    try {
        const quiz = await quizModel.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        quiz.title = newData.title;
        quiz.questions = newData.questions;

        quiz.save();

        return res.status(200).json({ success: true, message: 'Quiz updated successfully.' });
        
    } catch (error) {
        console.error('Error while updating quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while updating quiz: ' + error.message });
    }
};