import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import 'dotenv/config';
import connectMongoDB from './config/mongodb.js';
import connectRedis from './config/redis.js';

import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import quizRouter from './routes/quizRoutes.js';
import wordRouter from './routes/wordRoutes.js';

const app: Application = express();
const port = process.env.PORT || 5000;

connectMongoDB();
connectRedis();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true }));

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/word', wordRouter);

app.listen(port, () => console.log(`Server is running at http://localhost:${port}`));