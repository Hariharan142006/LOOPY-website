import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await request.json();

        const user = await db.user.findUnique({ where: { id: session.id } });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await db.user.update({
            where: { id: session.id },
            data: { password: hashedNewPassword }
        });

        return NextResponse.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error("Password Update API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
