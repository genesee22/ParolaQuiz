import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { createQuiz, removeQuiz, updateQuiz } from '../controllers/quizController.js';

const quizRouter = express.Router();

quizRouter.post('/', userAuth, createQuiz);
quizRouter.delete('/:id', userAuth, removeQuiz);
quizRouter.put('/:id', userAuth, updateQuiz);

export default quizRouter;