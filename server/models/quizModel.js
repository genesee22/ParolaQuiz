import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    title: String,
    questions: [{
        question: String,
        options: [String],
        correctAnswer: String
    }],
    createdAt: { type: Date, default: Date.now }
});

const quizModel = mongoose.models.quiz || mongoose.model('quiz', quizSchema);

export default quizModel;