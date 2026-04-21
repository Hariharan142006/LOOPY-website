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
        const { label, street, city, state, zip, lat, lng } = body;

        if (!street || !city || !state || !zip || lat === undefined || lng === undefined) {
            return NextResponse.json({ error: 'Missing address fields' }, { status: 400 });
        }

        const newAddress = await db.address.create({
            data: {
                userId: session.id,
                label: label || 'Other',
                street,
                city,
                state,
                zip,
                lat,
                lng
            }
        });

        return NextResponse.json({ success: true, address: newAddress });
    } catch (error) {
        console.error("Create Address API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
