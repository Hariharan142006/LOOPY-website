import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const booking = await db.booking.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, phone: true, email: true }
                },
                agent: {
                    select: { 
                        id: true, 
                        name: true, 
                        phone: true, 
                        currentLat: true, 
                        currentLng: true, 
                        vehicleType: true,
                        assignedVehicles: true
                    }
                },
                address: true,
                items: {
                    include: {
                        item: true
                    }
                }
            }
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // Allow both the customer and the assigned agent to view
        if (booking.userId !== session.id && booking.agentId !== session.id && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(booking);
    } catch (error) {
        console.error('Single Booking API Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
