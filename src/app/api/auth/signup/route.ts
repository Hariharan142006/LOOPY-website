import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, password, role = 'CUSTOMER', phone } = body;

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        let hashedPassword;
        try {
            hashedPassword = await bcrypt.hash(password, 10);
        } catch (hashError: any) {
            console.error("Hashing Error:", hashError);
            return NextResponse.json({ 
                error: 'Server error during security setup', 
                details: `Bcrypt: ${hashError.message}` 
            }, { status: 500 });
        }

        const userData: any = {
            name,
            email,
            password: hashedPassword,
            role,
            walletBalance: 0.0
        };

        if (phone) userData.phone = phone;

        const user = await db.user.create({
            data: userData
        });

        const token = signToken({ id: user.id, role: user.role });

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error: any) {
        console.error("Signup API Error:", error);
        
        if (error.code === 'P2002') {
            const target = error.meta?.target;
            // MongoDB targets can be arrays or strings
            const targetStr = Array.isArray(target) ? target.join(',') : String(target || '');
            
            if (targetStr.includes('email')) {
                return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
            }
            if (targetStr.includes('phone')) {
                return NextResponse.json({ error: 'Phone number already registered. Please provide a unique phone number.' }, { status: 400 });
            }
            return NextResponse.json({ error: 'User already exists with these details' }, { status: 400 });
        }

        return NextResponse.json({ 
            error: 'Server error during registration', 
            details: `${error.name}: ${error.message}${error.code ? ` (Code: ${error.code})` : ''}`
        }, { status: 500 });
    }
}
