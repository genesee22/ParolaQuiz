import mongoose, { Schema, Document } from 'mongoose';
import { nanoid } from 'nanoid';

export interface Question {
    question?: string;
    options?: string[];
    correctAnswer?: string; 
    explanation?: string;
    correctCount: number;
}

export interface Matching {
    a?: string;
    b?: string;
    correctCount: number;
}

export interface Share {
    token: string;
    public: boolean;
    userIds: mongoose.Types.ObjectId[];
}

export interface Quiz extends Document {
    userId: mongoose.Types.ObjectId;
    type: string;
    style: string;
    language: string;
    title?: string;

    questions?: Question[];
    matchings?: Matching[];

    userAnswers: string[] | { a: string, b: string }[];
    timesCompleted: number;

    share: Share;

    createdAt: Date;
    updatedAt: Date;
}

const quizSchema: Schema<Quiz> = new Schema<Quiz>({
    userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    type: { type: String, required: true },
    style: { type: String, required: true },
    language: { type: String }, 
    title: { type: String },

    questions: [{
        question: { type: String },
        options: [{ type: String }],
        correctAnswer: { type: String },
        explanation: { type: String },
        correctCount: { type: Number, default: 0 }
    }],

    matchings: [{
        a: { type: String },
        b: { type: String },
        correctCount: { type: Number, default: 0 }
    }],

    userAnswers: [{ type: Schema.Types.Mixed }],
    timesCompleted: { type: Number, default: 0 },

    share: {
        token: { type: String, unique: true, default: () => nanoid(10) },
        public: { type: Boolean, default: false },
        userIds: [{ type: Schema.Types.ObjectId, ref: 'user' }]
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

quizSchema.pre<Quiz>('save', function (next) {
    this.updatedAt = new Date(Date.now());
    next();
});

const quizModel = (mongoose.models.quiz || mongoose.model<Quiz>('quiz', quizSchema)) as mongoose.Model<Quiz>;

export default quizModel;