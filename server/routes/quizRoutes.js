import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { createQuiz, removeQuiz, updateQuiz, saveAnswers } from '../controllers/quizController.js';

const quizRouter = express.Router();

quizRouter.post('/', userAuth, createQuiz);
quizRouter.put('/:id', userAuth, updateQuiz);
quizRouter.put('/save-answers/:id', userAuth, saveAnswers);
quizRouter.delete('/:id', userAuth, removeQuiz);

export default quizRouter;