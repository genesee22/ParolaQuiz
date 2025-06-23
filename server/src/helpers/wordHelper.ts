import mongoose from "mongoose";
import wordModel, { Word } from "models/wordModel.js";
import { wordProcessChat } from "services/gemini.js";
import { log } from "console";

export const addWords = async (words: Partial<Word[]>, userId: string, quizId?: mongoose.Types.ObjectId): Promise<Word[]> => {
    const addedWords: Word[] = [];

    for (const word of words) {
        const existingWord = await wordModel.findOne({ userId: userId, word: word?.word });

        if (existingWord && quizId && !existingWord.quizIds.includes(quizId)) {
            existingWord.quizIds.push(quizId);
            await existingWord.save();
            
            addedWords.push(existingWord);

        } else if (!existingWord) {
            const newWord: Word = new wordModel({
                userId: userId,
                word: word?.word,
                language: word?.language,
                languageLevel: word?.languageLevel,
                category: word?.category,
                definition: word?.definition,
                exampleSentence: word?.exampleSentence,
                notes: word?.notes,
            });

            if (quizId) newWord.quizIds.push(quizId);
            await newWord.save();

            addedWords.push(newWord);
        }
    }
    return addedWords;
};

export const addAiFieldWordsToDB = async (userId: string, language: string, words: string, quizId?: mongoose.Types.ObjectId): Promise<any> => {
    const chat = await wordProcessChat(userId);

    if (!chat) {
        console.error('Failed to initialize word process chat session in addAiFieldWordsToDB helper.');
        return null;
    }

    const fieldWordsRaw = await chat.sendMessage({ message: `${language} words: ${words}` });
    const fieldWords = JSON.parse(fieldWordsRaw.text);
    
    const addedWords: Word[] = await addWords(fieldWords, userId, quizId ? quizId : undefined);

    return { addedWords, chat };
};
