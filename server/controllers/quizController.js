import quizModel from '../models/quizModel.js';
import vocabModel from '../models/vocabModel.js';

export const addWord = async (words, userId, quizId) => {
    if (words && Array.isArray(words)) {

        for (const word of words) {
            try {
                const existVocabItem = await vocabModel.findOne({ userId: userId, word: word })

                if (existVocabItem && !existVocabItem.quizIds.includes(quizId)) {
                    existVocabItem.quizIds.push(quizId);
                    await existVocabItem.save();
                }
                else {
                    const newVocabItem = new vocabModel({  
                        userId: userId,
                        word: word,
                        quizIds: [quizId]
                    });
                    await newVocabItem.save();
                }

            } catch (error) {
                console.error('Error while adding new word:', error.message);
            }

        }
    }
};

export const createQuiz = async (req, res) => {
    const { userId, userInput } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!userInput) {
        return res.status(400).json({ success: false, message: 'User input with type and data is required.' });
    }

    try {
        const quiz = new quizModel({
            userId: userId,
            title: 'Test Quiz',
            questions: [{
                question: 'Test question',
                options: ['Test answer'],       
                correctAnswer: 'Test answer',
            }],
        });

        await quiz.save(); 

        if (userInput.type === 'vocabulary') {
            await addWord(userInput.data, userId, quiz._id);
            const words = await vocabModel.find({ quizIds: quiz._id });

            return res.status(201).json({ 
                success: true, 
                message: 'Quiz successfully created with words added to vocabulary.', quiz, words 
            });
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Quiz successfully created.', quiz 
        });

    } catch (error) {
        console.error('Error while creating quiz:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while creating quiz: ' + error.message });
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

        const wordsFromQuiz = await vocabModel.find({ userId: userId, quizIds: quizId });
        if (wordsFromQuiz.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'Quiz removed successfully. No vocabulary words were linked to this quiz.'
            });
        }

        await vocabModel.updateMany(
            { userId, quizIds: quizId },
            { $pull: { quizIds: quizId } }
        );

        return res.status(200).json({ success: true, message: 'Quiz removed successfully.', 'Vocabulary words with removed quizId:': wordsFromQuiz });
        
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