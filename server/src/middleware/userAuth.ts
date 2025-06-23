import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const userAuth = (req: Request, res: Response, next: NextFunction): void => {
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
        res.status(401).json({ success: false, message: 'Access token is expired. Please, login again.' });
        return;
    }

    try {
        const ACCESS_TOKEN_SECRET: string | undefined = process.env.ACCESS_TOKEN_SECRET;

        if (!ACCESS_TOKEN_SECRET) {
            console.error('ACCESS_TOKEN_SECRET environment variable is not set.');
            res.status(500).json({ success: false, message: 'Server configuration error.' });
            return;
        }

        const tokenDecode = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as { id: string };
        req.body.userId = tokenDecode.id;

        next();
        
    } catch (error: any) {
        console.error('Access token verification failed:', error);
        res.status(403).json({ success: false, message: 'Invalid or expired access token: ' + error.message });
        return;
    
    }
};

export default userAuth;