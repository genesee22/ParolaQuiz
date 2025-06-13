import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const quizSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', 
        required: true
    },
    type: { type: String, required: true },
    style: { type: String, required: true },
    language: String,
    title: String,
    questions: [{ 
        question: String, 
        options: [String], 
        correctAnswer: String, 
        correctCount: { type: Number, default: 0 } 
    }],
    userAnswers: [String],
    timesCompleted: { type: Number, default: 0 },
    share: {
        token: { type: String, unique: true, default: () => nanoid(10) },
        public: { type: Boolean, default: false },
        userIds: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'user', 
            required: false,
        }],
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

quizSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const quizModel = mongoose.models.quiz || mongoose.model('quiz', quizSchema);

export default quizModel;