import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';

const app = express();
const port = process.env.PORT || '';

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true }));

app.get ('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => console.log(`Server is running at http://localhost:${port}`));