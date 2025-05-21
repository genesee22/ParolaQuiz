import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import authRouter from './routes/authRoutes.js'

const app = express();
const port = process.env.PORT || '';

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true }));

// API Endpoints
app.get ('/', (req, res) => res.send('ParolaQuiz Server'));
app.use('/api/auth', authRouter);

app.listen(port, () => console.log(`Server is running at http://localhost:${port}`));