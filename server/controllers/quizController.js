import quizModel from '../models/quizModel.js';
import vocabModel from '../models/vocabModel.js';
import { deleteQuizChat, deleteVocabChat, getQuizChat, getVocabChat } from '../services/geminiService.js';

export const addToVocabulary = async (words, userId, quizId=null) => {
    for (const word of words) {
        const existingWord = await vocabModel.findOne({ userId: userId, word: word.word })

        if (existingWord && !existingWord.quizIds.includes(quizId)) {
            existingWord.quizIds.push(quizId);
            await existingWord.save();

        } else {
            const newWord = new vocabModel({  
                userId: userId,
                word: word.word,
                language: word.language,
                languageLevel: word.languageLevel,
                category: word.category,
                definition: word.definition,
            });

            if (quizId !== null) newWord.quizIds.push(quizId);

            await newWord.save();
        }
    }
}

export const createQuiz = async (req, res) => {
    const { userId, userInput } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!userInput) {
        return res.status(400).json({ success: false, message: 'User input with type and data is required.' });
    }

    try {
        let quizChat = await getQuizChat(userId);
        
        let isOverloaded = quizChat.history.length > 101;
        if (isOverloaded) {
            deleteQuizChat(userId);
            quizChat = await getQuizChat(userId);
        }
        
        let generatedQuiz = await quizChat.sendMessage({
            message: `${userInput.language} ${userInput.type}, ${userInput.difficulty} difficulty, ${userInput.style} style${userInput.questions ? `, ${userInput.questions} questions` : ''}: ${userInput.data}`
        });
        generatedQuiz = JSON.parse(generatedQuiz.text);

        const quiz = new quizModel({
            userId: userId,
            type: userInput.type,
            title: generatedQuiz.title,
            questions: generatedQuiz.questions,
        });

        if (quiz.title === '') quiz.title = quiz.createdAt.toLocaleString();

        await quiz.save();

        if (userInput.type === 'vocabulary') {
            let vocabChat = await getVocabChat(userId);

            isOverloaded = vocabChat.history.length > 101;
            if (isOverloaded) {
                deleteVocabChat(userId);
                vocabChat = await getVocabChat(userId);
            }
        
            let processedWords = await vocabChat.sendMessage({ message: userInput.data });
            processedWords = JSON.parse(processedWords.text);

            addToVocabulary(processedWords, userId, quiz._id);

            return res.status(201).json({ 
                success: true, 
                message: 'Quiz successfully created.', 
                quiz: quiz,
                quizChat: quizChat.history,
                vocabularyChat: vocabChat.history
            });
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