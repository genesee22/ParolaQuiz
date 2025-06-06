import vocabModel from "../models/vocabModel.js";
import { getVocabChat } from "../services/geminiService.js";

export const addWord = async (req, res) => {
    const { userId, newWord } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!newWord) {
        return res.status(400).json({ success: false, message: 'New word is required.' });
    }

    try {
        const existingWord = await vocabModel.findOne({ word: newWord.word });

        if (existingWord) { 
            return res.status(409).json({ success: false, message: 'Word already exists.' });
        }

        const word = new vocabModel({
            userId: userId,
            word: newWord.word,
            languageLevel: newWord.languageLevel,
            category: newWord.category,
            definition: newWord.definition,
            exampleSentence: newWord.exampleSentence,
            notes: newWord.notes,
        });

        await word.save();

        return res.status(201).json({ success: true, message: 'New word added successfully.', word });

    } catch (error) {
        console.error('Error while adding new word:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while adding new word: ' + error.message });
    }
};

export const removeWord = async (req, res) => {
    const { userId } = req.body;
    const wordId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        const word = await vocabModel.findByIdAndDelete(wordId);

        if (!word) {
            return res.status(409).json({ success: false, message: 'Word not found.' });
        }

        return res.status(200).json({ success: true, message: 'Word removed successfully.' });

    } catch (error) {
        console.error('Error while removing word:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while removing word: ' + error.message });
    }
};

export const updateWrord = async (req, res) => {
    const { userId, newData } = req.body;
    const wordId = req.params.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!newData) {
        return res.status(400).json({ success: false, message: 'New data is required.' });
    }

    try {
        const word = await vocabModel.findById(wordId);

        if (!word) {
            return res.status(409).json({ success: false, message: 'Word not found.' });
        }

        word.word = newData.word;
        word.languageLevel = newData.languageLevel;
        word.category = newData.category;
        word.definition = newData.definition;
        word.exampleSentence = newData.exampleSentence;
        word.notes = newData.notes;

        await word.save();

        return res.status(200).json({ success: true, message: 'Word updated successfully.', word});

    } catch (error) {
        console.error('Error while updating word:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while updating word: ' + error.message });
    }
};

export const addWords = async (words, userId, quizId) => {
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
                exampleSentence: word.exampleSentence,
            });

            if (quizId) newWord.quizIds.push(quizId);

            await newWord.save();
        }
    }
}

export const addAiFieldWords = async (req, res) => {
    const { userId, newWords, language } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!newWords) {
        return res.status(400).json({ success: false, message: 'New words are required.' });
    }

    try {
        let vocabChat = await getVocabChat(userId);
        
        let isOverloaded = vocabChat.history.length > 101;
        if (isOverloaded) {
            deleteVocabChat(userId);
            vocabChat = await getVocabChat(userId);
        }

        let fieldWords = await vocabChat.sendMessage({ message: language ? `${language} words: ${newWords}`: newWords });
        fieldWords = JSON.parse(fieldWords.text);

        await addWords(fieldWords, userId);

        return res.status(201).json({ 
            success: true, 
            message: 'AI field words added successfully.',
            aiFieldWords: fieldWords, 
            vocabularyChat: vocabChat.history
        });

    } catch (error) {
        console.error('Error while adding AI field words:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while adding AI field words: ' + error.message });
    }
};