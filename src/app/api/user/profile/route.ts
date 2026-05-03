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
                image: true,
                assignedVehicles: true
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
        const { 
            name, email, phone, image, onboarded, preferredLanguage,
            vehicleName, vehiclePlate, vehicleType, capacityKg
        } = body;
        console.log("Profile Update Attempt for user:", session.id, "Body:", body);

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (image !== undefined) updateData.image = image;
        if (onboarded !== undefined) updateData.onboarded = onboarded;
        if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;
        if (vehicleType !== undefined) updateData.vehicleType = vehicleType;

        // Start a transaction to update user and handle fleet if needed
        const result = await db.$transaction(async (tx) => {
            const user = await tx.user.update({
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

            // If vehicle details are provided and user is an agent, handle FleetVehicle
            if (user.role === 'AGENT' && vehiclePlate && vehicleName) {
                await tx.fleetVehicle.upsert({
                    where: { licensePlate: vehiclePlate },
                    update: {
                        name: vehicleName,
                        vehicleType: vehicleType || 'Bicycle',
                        capacityKg: capacityKg ? Number(capacityKg) : undefined,
                        agentId: user.id,
                        status: 'ACTIVE'
                    },
                    create: {
                        name: vehicleName,
                        licensePlate: vehiclePlate,
                        vehicleType: vehicleType || 'Bicycle',
                        capacityKg: capacityKg ? Number(capacityKg) : 0,
                        agentId: user.id,
                        status: 'ACTIVE'
                    }
                });
            }

            return user;
        });

        console.log("Profile Update Success");
        return NextResponse.json({ success: true, user: result });
    } catch (error: any) {
        console.error("Profile Update API Error Details:", error);
        
        // Handle Prisma unique constraint error (e.g., phone already exists)
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('phone')) {
                return NextResponse.json({ error: 'This phone number is already in use by another account.' }, { status: 400 });
            }
            if (target.includes('email')) {
                return NextResponse.json({ error: 'This email is already in use.' }, { status: 400 });
            }
            return NextResponse.json({ error: 'A user with these details already exists.' }, { status: 400 });
        }

        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
