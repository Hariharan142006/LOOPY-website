import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = parseInt(searchParams.get('skip') || '0');

        const bookings = await db.booking.findMany({
            where: {
                userId: session.id
            },
            take: limit,
            skip: skip,
            include: {
                address: true,
                agent: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        assignedVehicles: true
                    }
                },
                items: {
                    take: 3, // Only need a preview for the list
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
