import mongoose from 'mongoose';

const vocabSchema = new mongoose.Schema({
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
    languageLevel: { type: String, default: '' },
    category: { type: String, default: '' },
    definition: { type: String },
    exampleSentence: { type: String },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

vocabSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const vocabModel = mongoose.models.vocabulary || mongoose.model('vocabulary', vocabSchema);

export default vocabModel;