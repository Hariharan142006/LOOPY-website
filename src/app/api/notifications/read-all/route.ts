import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function POST() {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const count = await (db as any).notification.updateMany({
            where: { 
                userId: session.id,
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        console.log(`Marked all notifications as read for user ${session.id}: count=${count.count}`);

        return NextResponse.json({ success: true, updatedCount: count.count });
    } catch (error) {
        console.error("Notifications Read-All API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
