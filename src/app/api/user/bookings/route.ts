import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const bookings = await db.booking.findMany({
            where: {
                userId: session.id
            },
            include: {
                address: true,
                items: {
                    include: {
                        item: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ bookings });
    } catch (error) {
        console.error("User Bookings API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
