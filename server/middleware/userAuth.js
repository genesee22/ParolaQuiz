import jwt from "jsonwebtoken";

const userAuth = (req, res, next) => {
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
        return res.status(401).json({ success: false, message: 'Access token not provided. Login again.' });
    }

    try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECET);
        req.body.userId = decoded.id;

        next();

    } catch (error) {
        console.error('Access token verification failed:', error);
        return res.status(403).json({ success: false, message: 'Invalid or expired access token.' });
    }
};

export default userAuth;
