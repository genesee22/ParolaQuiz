import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { getQuizById, getQuizzes, accessPublicQuiz, createQuiz, createImgQuiz, shareQuiz, updateQuiz, saveAnswers, removeQuiz } from '../controllers/quizController.js';

const quizRouter = express.Router();

quizRouter.get('/:id', userAuth, getQuizById );
quizRouter.get('/my', userAuth, getQuizzes );
quizRouter.get('/access/:token', accessPublicQuiz);

quizRouter.post('/', userAuth, createQuiz);
quizRouter.post('/img', userAuth, createImgQuiz);
quizRouter.post('/share/:id', userAuth, shareQuiz);

quizRouter.put('/:id', userAuth, updateQuiz);
quizRouter.put('/save-answers/:id', userAuth, saveAnswers);

quizRouter.delete('/:id', userAuth, removeQuiz);

export default quizRouter;