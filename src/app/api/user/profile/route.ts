import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: session.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                vehicleType: true,
                biometricsEnabled: true,
                appNotificationsEnabled: true,
                preferredLanguage: true,
                onboarded: true,
                image: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Profile GET API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, phone, image, onboarded, preferredLanguage } = body;
        console.log("Profile Update Attempt for user:", session.id, "Body:", body);

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (image !== undefined) updateData.image = image;
        if (onboarded !== undefined) updateData.onboarded = onboarded;
        if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;

        const updatedUser = await db.user.update({
            where: { id: session.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                image: true,
                onboarded: true,
                preferredLanguage: true
            }
        });

        console.log("Profile Update Success");
        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Profile Update API Error Details:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
