import mongoose from 'mongoose';

const wordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    quizIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz',
        required: false,
    }],
    word: { type: String, required: true },
    language: { type: String, default: '' },
    languageLevel: { type: String, default: '' },
    category: { type: String, default: '' },
    definition: { type: String },
    exampleSentence: { type: String },
    notes: { type: String },
    knowledge: { type: String, default: 'Added' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

wordSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const wordModel = mongoose.models.word || mongoose.model('words', wordSchema);

export default wordModel;