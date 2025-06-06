import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { getQuizById, getQuizzes, accessPublicQuiz, createQuiz, createImgQuiz, cloneQuiz, updateQuiz, shareQuiz, saveAnswers, removeQuiz } from '../controllers/quizController.js';

const quizRouter = express.Router();

quizRouter.get('/:id', userAuth, getQuizById );
quizRouter.get('/my', userAuth, getQuizzes );
quizRouter.get('/access/:token', accessPublicQuiz);

quizRouter.post('/', userAuth, createQuiz);
quizRouter.post('/img', userAuth, createImgQuiz);
quizRouter.post('/clone/:token', userAuth, cloneQuiz);

quizRouter.put('/:id', userAuth, updateQuiz);
quizRouter.put('/share/:id', userAuth, shareQuiz);
quizRouter.put('/save-answers/:id', userAuth, saveAnswers);

quizRouter.delete('/:id', userAuth, removeQuiz);

export default quizRouter;