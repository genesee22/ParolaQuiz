import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodemailer.js';

export const register = async (req, res) => {
    const {name, email, password} = req.body;

    if (!name || !email || !password)
        return res.json({success: false, message: 'Missing details.'});

    try {
        const existingUser = await userModel.findOne({email});

        if (existingUser) 
            return res.json({ success: false, message: 'User already exists.'});
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({name, email, password: hashedPassword});
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });
        res.cookie('token', token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const mailOptions = {
            from: process.env.EMAIL_SENDER,
            to: email,
            subject: 'Welcome to ParolaQuiz!',
            text: `Your account has been created successfully. We're excited to have you on board and can't wait to see how you do!`
        }

        await transporter.sendMail(mailOptions);

        return res.json({success: true});

    } catch (error) {
        res.json({success: false, message: error.message});
    }

};

export const login = async (req, res) => {
    const {email, password} = req.body;

    if (!email || !password)
        return res.json({success: false, message: 'Email and password are required.'});

    try {
        const user = await userModel.findOne({email});
        if (!user) 
            return res.json({ success: false, message: 'Invalid email.'});

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.json({ success: false, message: 'Invalid password.'});

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });
        res.cookie('token', token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.json({success: true});

    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.json({success: true, message: 'Logged Out.'});

    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const sendVerifyOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await userModel.findById(userId);

        if (user.isAccountVerified) 
            return res.json({ success: false, message: 'The account is already verified.'});

        const otp = String(Math.floor( 100000 + Math.random() * 900000 ));
        
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_SENDER,
            to: user.email,
            subject: 'Account Verification',
            text: `Please enter the OTP sent below to complete the verification process.
                   
                   ${otp}`
        }

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: 'Verification OTP was successfully sent on email.'});

    } catch (error) {
        res.json({ success: false, message: error.message});
    }
}

export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp)
        return res.json({ success: false, message: 'Missing details.' });

    try {
        const user = await userModel.findById(userId);

        if (!user) 
            return res.json({ success: false, message: 'User not found.' });
        
        if (user.verifyOtp === '' || user.verifyOtp !== otp)
            return res.json({ success: false, message: 'Invalid OTP.' });
        
        if (user.verifyOtpExpireAt < Date.now())
            return res.json({ success: false, message: 'OTP expired.' });

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;

        await user.save();

        return res.json({ success: true, message: 'Email verified successfully.' });
        
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}