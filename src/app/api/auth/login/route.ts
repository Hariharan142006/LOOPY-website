import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        const user = await db.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(password, user.password);
        } catch (e) {
            isPasswordValid = false;
        }

        // Legacy Support: If bcrypt fails, check if input matches DB plaintext exactly
        if (!isPasswordValid && user.password === password) {
            console.log(`[AUTH-API] Migrating legacy plaintext password for user: ${email}`);
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });
            isPasswordValid = true;
        }

        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Generate Token
        const token = signToken({ id: user.id, role: user.role });

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                vehicleType: user.vehicleType
            }
        });
    } catch (error) {
        console.error("Login API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
