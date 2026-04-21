import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { headers } from 'next/headers';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log(`[FORENSIC] Fetching Booking ID: ${id}`);
        const session = await getAuthSession();

        if (!session) {
            console.log(`[FORENSIC] No session provided for booking ${id}`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const booking = await db.booking.findUnique({
            where: { id: id },
            include: {
                user: { select: { name: true, phone: true } },
                agent: { select: { name: true } },
                address: true,
                items: { include: { item: true } }
            }

        });

        if (!booking) {
            console.log(`[FORENSIC] Booking NOT FOUND: ${id}`);
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        console.log(`[FORENSIC] Booking found: ${booking.user?.name}`);
        return NextResponse.json(booking);
    } catch (error: any) {
        console.error("[FORENSIC] Booking Fetch Error:", error);
        return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
    }
}

