import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { addWord, removeWord, updateWrord, addAiFieldWords } from '../controllers/vocabController.js';

const vocabRouter = express.Router();

vocabRouter.post('/', userAuth, addWord);
vocabRouter.post('/ai', userAuth, addAiFieldWords);
vocabRouter.put('/:id', userAuth, updateWrord);
vocabRouter.delete('/:id', userAuth, removeWord);

export default vocabRouter;