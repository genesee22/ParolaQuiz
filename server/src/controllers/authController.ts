import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodemailer.js';

export const register = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body as { name: string; email: string; password: string };

    if (!name || !email || !password) {
        res.status(400).json({ success: false, message: 'Missing required details.' });
        return;
    }

    try {
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            res.status(409).json({ success: false, message: 'User with this email already exists.' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({ name, email, password: hashedPassword });
        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_SENDER,
            to: email,
            subject: 'Welcome to ParolaQuiz!',
            text: `Your account has been created successfully!`,
        };

        await transporter.sendMail(mailOptions);

        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '1d' });
        const accessToken = jwt.sign({ id: user._id, username: user.name, email: user.email }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '30m' });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 1 * 24 * 60 * 60 * 1000,
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 30 * 60 * 1000,
        });

        res.status(201).json({
            success: true,
            message: 'Registration process went successful. Please check your email for verification.',
            accessToken: accessToken
        });
        return;

    } catch (error: any) {
        console.error('Error during registration:', error);
        res.status(500).json({ success: false, message: 'Internal server error during registration: ' + error.message });
        return;
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid email.' });
            return;
        }
        const isMatch = await bcrypt.compare(password, user.password as string);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid password.' });
            return;
        }

        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '1d' });
        const accessToken = jwt.sign({ id: user._id, username: user.name, email: user.email }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '30m' });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 1 * 24 * 60 * 60 * 1000,
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 30 * 60 * 1000,
        });

        res.status(201).json({
            success: true,
            message: 'Login process went successful.',
            accessToken: accessToken
        });
        return;

    } catch (error: any) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: 'Internal server error during login: ' + error.message });
        return;
    }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies.refreshToken as string;

    if (!refreshToken) {
        res.status(401).json({ success: false, message: 'Unauthorized. Please login again.' });
        return;
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as jwt.JwtPayload;

        const user = await userModel.findById(decoded.id);
        if (!user) {
            res.status(401).json({ success: false, message: 'Unauthorized. Please login again.' });
            return;
        }

        const accessToken = jwt.sign(
            { id: user._id, username: user.name, email: user.email },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: '30m' }
        );

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 30 * 60 * 1000,
        });

        res.json({ accessToken });
        return;

    } catch (error: any) {
        res.status(403).json({ success: false, message: `Forbidden: ${error.message}` });
        return;
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });

        res.status(200).json({ success: true, message: 'Logged out successfully.' });
        return;

    } catch (error: any) {
        console.error('Error during logout:', error);
        res.status(500).json({ success: false, message: 'Internal server error during logout: ' + error.message });
        return;
    }
};

export const sendVerifyOtp = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body as { userId: string };

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found.' });
            return;
        }
        if (user.isAccountVerified) {
            res.status(400).json({ success: false, message: 'Account is already verified.' });
            return;
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_SENDER,
            to: user.email,
            subject: 'Account Verification',
            text: `Please enter the OTP sent below to complete the verification process:\n\n${otp}`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: 'Verification OTP sent successfully to email.' });
        return;

    } catch (error: any) {
        console.error('Error sending verification OTP:', error);
        res.status(500).json({ success: false, message: 'Internal server error while sending verification OTP: ' + error.message });
        return;
    }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const { userId, otp } = req.body as { userId: string, otp: string };

    if (!userId || !otp) {
        res.status(400).json({ success: false, message: 'User ID and OTP are required.' });
        return;
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found.' });
            return;
        }
        if (otp === '' || otp !== user.verifyOtp) {
            res.status(401).json({ success: false, message: 'Invalid OTP.' });
            return;
        }
        if (user.verifyOtpExpireAt && user.verifyOtpExpireAt < Date.now()) {
            res.status(400).json({ success: false, message: 'OTP has expired.' });
            return;
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;

        await user.save();

        res.status(200).json({ success: true, message: 'Email verified successfully.' });
        return;

    } catch (error: any) {
        console.error('Error during email verification:', error);
        res.status(500).json({ success: false, message: 'Internal server error during email verification: ' + error.message });
        return;
    }
};

export const isAuthenticated = async (req: Request, res: Response): Promise<void> => {
    try {
        res.status(200).json({ success: true });
        return;
    } catch (error: any) {
        console.error('Error during authentication check:', error);
        res.status(500).json({ success: false, message: 'Internal server error during authentication check: ' + error.message });
        return;
    }
};

export const sendResetOtp = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body as { userId: string };

    if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            res.status(404).json({ success: false, message: 'User with this ID not found.' });
            return;
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 130 * 60 * 1000;

        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_SENDER,
            to: user.email,
            subject: 'Password Reset',
            text: `Please enter the OTP sent below to reset your password:\n\n${otp}`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: 'Password reset OTP sent successfully to email.' });
        return;

    } catch (error: any) {
        console.error('Error sending reset OTP:', error);
        res.status(500).json({ success: false, message: 'Internal server error while sending reset OTP: ' + error.message });
        return;
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { userId, newPassword, otp } = req.body as { userId: string, newPassword: string, otp: string };

    if (!userId || !newPassword || !otp) {
        res.status(400).json({ success: false, message: 'User ID, password and otp are required.' });
        return;
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            res.status(404).json({ success: false, message: 'User with this ID not found.' });
            return;
        }
        if (otp === '' || otp !== user.resetOtp) {
            res.status(401).json({ success: false, message: 'Invalid OTP.' });
            return;
        }
        if (user.resetOtpExpireAt && user.resetOtpExpireAt < Date.now()) {
            res.status(400).json({ success: false, message: 'OTP has expired.' });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.resetOtp = '';
        user.resetOtpExpireAt = 0;
        user.password = hashedPassword;

        await user.save();

        res.status(200).json({ success: true, message: 'Password has been changed successfully.' });
        return;

    } catch (error: any) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, message: 'Internal server error while resetting password: ' + error.message });
        return;
    }
};