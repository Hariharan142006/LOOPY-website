import jwt from 'jsonwebtoken';

const getSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error("JWT_SECRET environment variable is required in production");
        }
        return 'development-secret-key-for-local-testing-only';
    }
    return secret;
};

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
