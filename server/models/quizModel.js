import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', 
        required: true
    },
    type: { type: String, required: true },
    title: String,
    questions: [{ 
        question: String, 
        options: [String], 
        correctAnswer: String, 
        correctCount: { type: Number, default: 0 } 
    }],
    userAnswers: [String ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

quizSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const quizModel = mongoose.models.quiz || mongoose.model('quiz', quizSchema);

export default quizModel;