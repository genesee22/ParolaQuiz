import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import quizRouter from './routes/quizRoutes.js';
import vocabRouter from './routes/vocabRoutes.js';

const app = express();
const port = process.env.PORT || '';

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true }));

app.get ('/', (req, res) => res.send('ParolaQuiz Server'));
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/vocabulary', vocabRouter);

app.listen(port, () => console.log(`Server is running at http://localhost:${port}`));