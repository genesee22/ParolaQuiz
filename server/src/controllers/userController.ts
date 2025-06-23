import { Request, Response } from 'express';
import userModel from "../models/userModel.js";

export const getUserData = async (req: Request, res: Response): Promise<void> => {
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

        res.status(200).json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                isAccountVerified: user.isAccountVerified,
            }
        });

        return;

    } catch (error: any) {
        console.error('Error getting user data:', error);
        res.status(500).json({ success: false, message: 'Internal server error while getting user data: ' + error.message });
        return
    }
};