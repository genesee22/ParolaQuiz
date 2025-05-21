import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodemailer.js';

export const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Missing required details.' });
    }

    try {
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({ name, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const mailOptions = {
            from: process.env.EMAIL_SENDER,
            to: email,
            subject: 'Welcome to ParolaQuiz!',
            text: `Your account has been created successfully. We're excited to have you on board and can't wait to see how you do!`,
        };

        await transporter.sendMail(mailOptions);
            
        return res.status(201).json({ success: true, message: 'Registration successful. Please check your email for verification.' });

    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password.' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({ success: true, message: 'Login successful.' });

    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during login.' });
    }
};

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({ success: true, message: 'Logged out successfully.' });

    } catch (error) {
        console.error('Error during logout:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during logout.' });
    }
};

export const sendVerifyOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.isAccountVerified) {
            return res.status(400).json({ success: false, message: 'Account is already verified.' });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_SENDER,
            to: user.email,
            subject: 'Account Verification',
            text: `Please enter the OTP sent below to complete the verification process.\n\n${otp}`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: 'Verification OTP sent successfully to email.' });

    } catch (error) {
        console.error('Error sending verification OTP:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while sending verification OTP.' });
    }
};

export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.status(400).json({ success: false, message: 'User ID and OTP are required.' });
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (otp === '' || otp !== user.verifyOtp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' }); 
        }
        if (user.verifyOtpExpireAt < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP has expired.' }); 
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;

        await user.save();

        return res.status(200).json({ success: true, message: 'Email verified successfully.' });

    } catch (error) {
        console.error('Error during email verification:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during email verification.' });
    }
};

export const isAuthenticated = async (req, res) => {
    try {
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error during authentication check:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during authentication check.' });
    }
};

export const sendResetOtp = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User with this ID not found.' }); 
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_SENDER,
            to: user.email,
            subject: 'Password Reset',
            text: `Please enter the OTP sent below to reset your password.\n\n${otp}`,
        };

        await transporter.sendMail(mailOptions);
        
        return res.status(200).json({ success: true, message: 'Password reset OTP sent successfully to email.' });

    } catch (error) {
        console.error('Error sending reset OTP:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while sending reset OTP.' });
    }
};

export const resetPassword = async (req, res) => {
    const { userId, newPassword, otp } = req.body;

    if (!userId || !newPassword || !otp) {
        return res.status(400).json({ success: false, message: 'User ID, password and otp are required.' });
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User with this ID not found.' }); 
        } 
        if (otp === '' || otp !== user.resetOtp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' })
        }
        if (user.resetOtpExpireAt < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP has expired.' }); 
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.resetOtp = ''; 
        user.resetOtpExpireAt = 0;
        user.password = hashedPassword;

        await user.save();

        return res.status(200).json({ success: true, message: 'Password has been changed successfully.' });

    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while resetting password.' });
    }
};