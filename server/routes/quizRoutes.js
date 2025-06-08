import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { getQuizById, getMyQuizzes, getSharedQuiz, createQuiz, createImgQuiz, cloneQuiz, updateQuiz, shareQuiz, saveAnswers, removeQuiz, unshareQuiz } from '../controllers/quizController.js';

const quizRouter = express.Router();

quizRouter.get('/:id', userAuth, getQuizById );
quizRouter.get('/my', userAuth, getMyQuizzes );
quizRouter.get('/shared/:token', userAuth, getSharedQuiz);

quizRouter.post('/', userAuth, createQuiz);
quizRouter.post('/img', userAuth, createImgQuiz);
quizRouter.post('/clone/:id', userAuth, cloneQuiz);

quizRouter.put('/:id', userAuth, updateQuiz);
quizRouter.put('/share/:id', userAuth, shareQuiz);
quizRouter.put('/save-answers/:id', userAuth, saveAnswers);

quizRouter.delete('/:id', userAuth, removeQuiz);
quizRouter.delete('/unshare/:id', userAuth, unshareQuiz);

export default quizRouter;