import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { getQuizzes, getQuizById, getSharedQuiz, createQuiz, cloneQuiz, updateQuiz, shareQuiz, saveAnswers, removeQuiz, unshareQuiz } from '../controllers/quizController.js';

const quizRouter = express.Router();

quizRouter.get('/', userAuth, getQuizzes);
quizRouter.get('/:id', userAuth, getQuizById );
quizRouter.get('/shared/:token', userAuth, getSharedQuiz);

quizRouter.post('/', userAuth, createQuiz);
quizRouter.post('/clone/:id', userAuth, cloneQuiz);

quizRouter.put('/:id', userAuth, updateQuiz);
quizRouter.put('/share/:id', userAuth, shareQuiz);
quizRouter.put('/save-answers/:id', userAuth, saveAnswers);

quizRouter.delete('/:id', userAuth, removeQuiz);
quizRouter.delete('/unshare/:id', userAuth, unshareQuiz);

export default quizRouter;