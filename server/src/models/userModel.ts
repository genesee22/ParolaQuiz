import mongoose, { Schema, Document } from 'mongoose';

export interface User extends Document {
    name: string;
    email: string;
    password?: string;
    verifyOtp: string;
    verifyOtpExpireAt: number;
    isAccountVerified: boolean;
    resetOtp: string;
    resetOtpExpireAt: number;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema: Schema<User> = new Schema<User>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    verifyOtp: { type: String, default: '' },
    verifyOtpExpireAt: { type: Number, default: 0 },
    isAccountVerified: { type: Boolean, default: false },
    resetOtp: { type: String, default: '' },
    resetOtpExpireAt: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

userSchema.pre<User>('save', function (next) {
    this.updatedAt = new Date(Date.now());
    next();
});

const userModel = (mongoose.models.user || mongoose.model<User>('user', userSchema)) as mongoose.Model<User>;

export default userModel;