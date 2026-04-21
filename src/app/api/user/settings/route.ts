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
                biometricsEnabled: true,
                appNotificationsEnabled: true,
                preferredLanguage: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { biometricsEnabled, appNotificationsEnabled, preferredLanguage } = body;

        const updatedUser = await db.user.update({
            where: { id: session.id },
            data: {
                ...(biometricsEnabled !== undefined && { biometricsEnabled }),
                ...(appNotificationsEnabled !== undefined && { appNotificationsEnabled }),
                ...(preferredLanguage !== undefined && { preferredLanguage }),
            },
            select: {
                biometricsEnabled: true,
                appNotificationsEnabled: true,
                preferredLanguage: true
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Settings Update API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
