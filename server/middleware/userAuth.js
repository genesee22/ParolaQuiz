import jwt from "jsonwebtoken";

const userAuth = (req, res, next) => {
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) return res.status(401).json({ success: false, message: 'Access token is expired. Please, login again.' });

    try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        req.body.userId = decoded.id;

        next();

    } catch (error) {
        console.error('Access token verification failed:', error);
        return res.status(403).json({ success: false, message: 'Invalid or expired access token.' + error.message });
    }
};

export default userAuth;
