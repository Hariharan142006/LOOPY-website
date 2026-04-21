import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing address ID' }, { status: 400 });
        }

        const address = await db.address.findUnique({ where: { id } });
        if (!address || address.userId !== session.id) {
            return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
        }

        await db.address.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete Address API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
