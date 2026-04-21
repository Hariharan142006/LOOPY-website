import jwt from 'jsonwebtoken';

const getSecret = () => process.env.JWT_SECRET || 'development-secret-key-change-this-in-production';

if (!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET is not set in environment variables. Using development fallback.");
}

export function signToken(payload: any) {
    return jwt.sign(payload, getSecret(), { expiresIn: '30d' });
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, getSecret());
    } catch (e) {
        return null;
    }
}
