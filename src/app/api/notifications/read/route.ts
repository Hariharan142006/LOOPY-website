import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
        }

        // Use findFirst to verify ownership then update
        const notif = await (db as any).notification.findFirst({
            where: { 
                id: id,
                userId: session.id 
            }
        });

        if (!notif) {
            return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }

        const updated = await (db as any).notification.update({
            where: { id: notif.id },
            data: { isRead: true }
        });

        return NextResponse.json({ success: true, notification: updated });
    } catch (error) {
        console.error("Notifications Read API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
