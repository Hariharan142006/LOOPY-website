import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const addresses = await db.address.findMany({
            where: {
                userId: session.id
            }
        });

        return NextResponse.json({ addresses });
    } catch (error) {
        console.error("Addresses API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
