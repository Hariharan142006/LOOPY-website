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
        const { items, schedule, location, totalAmount, remarks } = body;

        // Validation
        if (!items || !schedule || !location || items.length === 0) {
            return NextResponse.json({ error: 'Missing booking details' }, { status: 400 });
        }

        // Logic for Address (matching web)
        // If it's a new location, we might want to store it or just use the coords
        let addressId: string;
        
        // Find existing address or use a generic one/handle coordination
        const existingAddress = await db.address.findFirst({
            where: {
                userId: session.id,
                lat: location.lat,
                lng: location.lng
            }
        });

        if (existingAddress) {
            addressId = existingAddress.id;
        } else {
            // Create a temporary/new address for this pickup
            const newAddress = await db.address.create({
                data: {
                    userId: session.id,
                    street: location.address.split(',')[0] || 'Unknown Street',
                    city: 'Unknown City', // Geocoding would happen here usually
                    state: 'Unknown State',
                    zip: '000000',
                    lat: location.lat,
                    lng: location.lng,
                    label: 'Pickup Location'
                }
            });
            addressId = newAddress.id;
        }

        // Create the booking
        const booking = await db.booking.create({
            data: {
                userId: session.id,
                addressId,
                status: 'PENDING',
                scheduledAt: new Date(`${schedule.date}T${schedule.time || '09:30'}:00`),
                pickupLat: location.lat,
                pickupLng: location.lng,
                totalAmount: totalAmount || 0,
                remarks: remarks || '',
                items: {
                    create: items.map((item: any) => ({
                        itemId: item.id,
                        quantity: item.qty || 1,
                        priceAtBooking: item.price || 0
                    }))
                }
            }
        });

        return NextResponse.json({ success: true, bookingId: booking.id });
    } catch (error) {
        console.error("Create Booking API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
