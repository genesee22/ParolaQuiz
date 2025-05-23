import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { addWord, removeWord, updateWrord } from '../controllers/vocabController.js';

const vocabRouter = express.Router();

vocabRouter.post('/', userAuth, addWord);
vocabRouter.delete('/:id', userAuth, removeWord);
vocabRouter.put('/:id', userAuth, updateWrord);

export default vocabRouter;