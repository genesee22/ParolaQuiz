import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { addWord, addAiFieldWords, updateWord, removeWord } from '../controllers/wordController.js';

const wordRouter = express.Router();

wordRouter.post('/', userAuth, addWord);
wordRouter.post('/ai', userAuth, addAiFieldWords);
wordRouter.put('/:id', userAuth, updateWord);
wordRouter.delete('/:id', userAuth, removeWord);

export default wordRouter;