import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
    const { token } = req.cookies;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized. Login again.'});
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET_KEY);

        if (tokenDecode.id) req.body.userId = tokenDecode.id;
        else return res.status(401).json({ success: false, message: 'Not authorized. Login again.'});

        next();
        
    } catch (error) {
        console.error('Error checking token:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while checking token.' });
    }
}

export default userAuth;
