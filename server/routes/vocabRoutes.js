import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { addWord, removeWord } from '../controllers/vocabController.js';

const vocabRouter = express.Router();

vocabRouter.post('/', userAuth, addWord);
vocabRouter.delete('/:id', userAuth, removeWord);

export default vocabRouter;