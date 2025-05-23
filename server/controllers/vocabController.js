import vocabModel from "../models/vocabModel.js";

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

        return res.status(201).json({ success: true, message: 'New word added successfully.' });

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

        return res.status(201).json({ success: true, message: 'Word removed successfully.' });

    } catch (error) {
        console.error('Error while removing word:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while removing word: ' + error.message });
    }
};