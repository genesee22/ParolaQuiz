import mongoose, { Schema, Document } from 'mongoose';

export interface Word extends Document {
    userId: mongoose.Types.ObjectId;
    quizIds: mongoose.Types.ObjectId[];
    word: string;
    language: string;
    languageLevel: string;
    category: string;
    definition?: string;
    exampleSentence?: string;
    notes?: string;
    knowledge: string;
    createdAt: Date;
    updatedAt: Date;
}

const wordSchema: Schema<Word> = new Schema<Word>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    quizIds: [{
        type: Schema.Types.ObjectId,
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

wordSchema.pre<Word>('save', function (next) {
    this.updatedAt = new Date(Date.now());
    next();
});

const wordModel = (mongoose.models.word || mongoose.model<Word>('words', wordSchema)) as mongoose.Model<Word>;

export default wordModel;