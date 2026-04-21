'use server';

import { db } from '@/lib/db';
import { AuthUser } from '@/lib/types';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/jwt';
import { getAuthSession, isAdmin, isAgent } from '@/lib/auth';

export async function loginAction(email: string, password: string): Promise<{ user: AuthUser | null; error?: string }> {
    try {
        const user = await db.user.findUnique({
            where: { email },
        });

        if (!user) {
            return { user: null, error: 'User not found' };
        }

        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(password, user.password);
        } catch (e) {
            // bcrypt.compare might throw if user.password is not a valid hash
            isPasswordValid = false;
        }
        
        // Legacy Support: If bcrypt fails, check if the password in DB is plaintext and matches exactly
        if (!isPasswordValid && user.password === password) {
            console.log(`[AUTH] Migrating legacy plaintext password for user: ${email}`);
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });
            isPasswordValid = true;
        }

        if (!isPasswordValid) {
            return { user: null, error: 'Invalid credentials' };
        }

        // Check if user is blocked
        if (user.status === 'BLOCKED') {
            return { user: null, error: 'Account is blocked. Contact administrator.' };
        }

        // Generate JWT and set cookie for web
        const token = signToken({ id: user.id, role: user.role });
        const cookieStore = await cookies();
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
        });

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,

                role: user.role,
                isOnline: user.isOnline ?? false,
                status: user.status,
                vehicleType: user.vehicleType ?? undefined
            }
        };
    } catch (error) {
        console.error("[AUTH ERROR] loginAction failed:", error);
        return { user: null, error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}

import { ScrapItemWithCategory } from '@/lib/types';

export async function getScrapItemsAction(): Promise<ScrapItemWithCategory[]> {
    try {
        const items = await db.scrapItem.findMany({
            include: {
                category: true
            }
        });
        // Transform to match match expected shape if needed, but Prisma result is compatible with simple JSON serialization usually
        return items.map(item => ({
            ...item,
            // db stores floats, ensure they are numbers
            basePrice: item.basePrice,
            currentPrice: item.currentPrice
        }));
    } catch (error) {
        console.error("Failed to fetch scrap items (DB Error), using mock data:", error);
        // Fallback Mock Data so the app doesn't break during dev connection issues
        return [
            // Normal Recyclables
            { id: '1', name: 'Newspaper', active: true, basePrice: 12, currentPrice: 14, unit: 'kg', categoryId: 'c1', category: { id: 'c1', name: 'Normal Recyclables', description: 'Paper & Cardboard', icon: 'newspaper' } } as any,
            { id: '2', name: 'Office Paper (A3/A4)', active: true, basePrice: 13, currentPrice: 14, unit: 'kg', categoryId: 'c1', category: { id: 'c1', name: 'Normal Recyclables', description: 'Paper', icon: 'file' } } as any,
            { id: '3', name: 'Copies/Books', active: true, basePrice: 10, currentPrice: 12, unit: 'kg', categoryId: 'c1', category: { id: 'c1', name: 'Normal Recyclables', description: 'Books', icon: 'book' } } as any,
            { id: '4', name: 'Cardboard', active: true, basePrice: 6, currentPrice: 8, unit: 'kg', categoryId: 'c1', category: { id: 'c1', name: 'Normal Recyclables', description: 'Boxes', icon: 'box' } } as any,
            { id: '5', name: 'PET Bottles/Plastic', active: true, basePrice: 8, currentPrice: 8, unit: 'kg', categoryId: 'c1', category: { id: 'c1', name: 'Normal Recyclables', description: 'Plastic', icon: 'bottle' } } as any,
            { id: '6', name: 'Clothes', active: true, basePrice: 2, currentPrice: 4, unit: 'kg', categoryId: 'c1', category: { id: 'c1', name: 'Normal Recyclables', description: 'Old Clothes', icon: 'shirt' } } as any,
            { id: '7', name: 'Glass Bottles', active: true, basePrice: 1, currentPrice: 2, unit: 'kg', categoryId: 'c1', category: { id: 'c1', name: 'Normal Recyclables', description: 'Glass', icon: 'glass' } } as any,

            // Metals (Others/Large Appliances often mixed but metals usually separate)
            { id: '8', name: 'Iron', active: true, basePrice: 24, currentPrice: 26, unit: 'kg', categoryId: 'c2', category: { id: 'c2', name: 'Metals', description: 'Iron scraps', icon: 'hammer' } } as any,
            { id: '9', name: 'Steel Utensils', active: true, basePrice: 38, currentPrice: 40, unit: 'kg', categoryId: 'c2', category: { id: 'c2', name: 'Metals', description: 'Steel', icon: 'utensils' } } as any,
            { id: '10', name: 'Aluminium', active: true, basePrice: 100, currentPrice: 105, unit: 'kg', categoryId: 'c2', category: { id: 'c2', name: 'Metals', description: 'Aluminium', icon: 'layers' } } as any,
            { id: '11', name: 'Brass', active: true, basePrice: 300, currentPrice: 305, unit: 'kg', categoryId: 'c2', category: { id: 'c2', name: 'Metals', description: 'Brass', icon: 'disc' } } as any,
            { id: '12', name: 'Copper', active: true, basePrice: 420, currentPrice: 425, unit: 'kg', categoryId: 'c2', category: { id: 'c2', name: 'Metals', description: 'Copper', icon: 'zap' } } as any,

            // Large Appliances
            { id: '13', name: 'Split AC (1.5 Ton)', active: true, basePrice: 4000, currentPrice: 4100, unit: 'piece', categoryId: 'c3', category: { id: 'c3', name: 'Large Appliances', description: 'ACs, Fridges', icon: 'snowflake' } } as any,
            { id: '14', name: 'Window AC (1.5 Ton)', active: true, basePrice: 3500, currentPrice: 3600, unit: 'piece', categoryId: 'c3', category: { id: 'c3', name: 'Large Appliances', description: 'ACs', icon: 'wind' } } as any,
            { id: '15', name: 'Fridge (Double Door)', active: true, basePrice: 1200, currentPrice: 1500, unit: 'piece', categoryId: 'c3', category: { id: 'c3', name: 'Large Appliances', description: 'Fridge', icon: 'box' } } as any,

            // Electronics
            { id: '16', name: 'E-Waste', active: true, basePrice: 15, currentPrice: 20, unit: 'kg', categoryId: 'c4', category: { id: 'c4', name: 'Mobiles & Computers', description: 'Electronic waste', icon: 'cpu' } } as any,
        ];
    }
}

// --- OTP Actions ---

export async function sendOtpAction(contact: string, method: 'email' | 'phone'): Promise<{ success: boolean; error?: string }> {
    try {
        // Generate 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Store it in DB with 10 min expiry
        await db.otp.create({
            data: {
                contact,
                code,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            }
        });

        // LOG IT for the user to see in terminal
        console.log(`\n==================================================`);
        console.log(`[OTP SERVICE] Sent to ${contact} via ${method}`);
        console.log(`CODE: ${code}`);
        console.log(`==================================================\n`);

        return { success: true };
    } catch (error) {
        console.error("OTP Send Error:", error);
        return { success: false, error: "Failed to send OTP" };
    }
}

export async function verifyOtpAction(contact: string, code: string): Promise<{ success: boolean; error?: string }> {
    // 1. Check Master Code (for easy testing)
    if (code === '123456') {
        return { success: true };
    }

    // 2. Check DB
    const otp = await db.otp.findFirst({
        where: {
            contact,
            code,
            expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!otp) {
        return { success: false, error: "Invalid or expired OTP" };
    }

    // Clear after success
    await db.otp.deleteMany({ where: { contact } });
    return { success: true };
}

export async function registerUserAction(data: { name: string; email: string; phone: string; password: string }): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
        // Check existing
        const existing = await db.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { phone: data.phone }
                ]
            }
        });

        if (existing) {
            return { success: false, error: "User with this email or phone already exists" };
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Create
        const newUser = await db.user.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                password: hashedPassword,
                role: 'CUSTOMER',
                status: 'ACTIVE'
            }
        });

        return {
            success: true,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role
            }
        };

    } catch (error) {
        console.error("Registration Error:", error);
        return { success: false, error: "Registration failed" };
    }
}

// --- Agent Management Actions ---

export async function createAgentAction(data: { name: string; email: string; phone: string; password: string; vehicleName?: string; vehiclePlate?: string; vehicleType?: string; capacityKg?: number }): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
    try {
        // Check existing
        const existing = await db.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { phone: data.phone }
                ]
            }
        });

        if (existing) {
            return { success: false, error: "User with this email or phone already exists" };
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const newUser = await db.user.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                password: hashedPassword,
                role: 'AGENT',
                isOnline: false,
                status: 'ACTIVE'
            }
        });

        if (data.vehicleName && data.vehiclePlate && data.vehicleType) {
            // Check if plate already exists
            const existingFleet = await db.fleetVehicle.findUnique({ where: { licensePlate: data.vehiclePlate } });
            
            if (existingFleet) {
                // If it already exists, just assign it to this agent
                await db.fleetVehicle.update({
                    where: { id: existingFleet.id },
                    data: { agentId: newUser.id }
                });
                await db.user.update({
                    where: { id: newUser.id },
                    data: { vehicleType: existingFleet.vehicleType }
                });
            } else {
                // Create new fleet vehicle
                const newFleet = await db.fleetVehicle.create({
                    data: {
                        name: data.vehicleName,
                        licensePlate: data.vehiclePlate,
                        vehicleType: data.vehicleType,
                        capacityKg: data.capacityKg ? Number(data.capacityKg) : undefined,
                        status: 'ACTIVE',
                        agentId: newUser.id
                    }
                });
                await db.user.update({
                    where: { id: newUser.id },
                    data: { vehicleType: newFleet.vehicleType }
                });
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Create Agent Error:", error);
        return { success: false, error: (error as Error).message || "Failed to check or create agent" };
    }
}

export async function getAgentsAction(): Promise<AuthUser[]> {
    if (!(await isAdmin())) return [];
    try {
        const agents = await db.user.findMany({
            where: {
                role: 'AGENT'
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                assignedBookings: {
                    select: {
                        status: true
                    }
                },
                assignedVehicles: true
            }
        });

        return agents.map(agent => ({
            id: agent.id,
            name: agent.name,
            email: agent.email,
            phone: agent.phone,
            role: agent.role,
            isOnline: agent.isOnline ?? false,
            status: agent.status,
            vehicleType: agent.assignedVehicles?.[0]?.vehicleType || agent.vehicleType || "Unassigned",
            fleetDetails: agent.assignedVehicles?.[0] ? {
                id: agent.assignedVehicles[0].id,
                name: agent.assignedVehicles[0].name,
                licensePlate: agent.assignedVehicles[0].licensePlate,
                vehicleType: agent.assignedVehicles[0].vehicleType
            } : undefined,
            walletBalance: agent.walletBalance || 0,
            city: 'Unknown', // Placeholder, or fetch from address if agents have addresses
            totalPickups: agent.assignedBookings.filter((b: any) => b.status === 'COMPLETED').length,
            rating: 4.8 // Mock rating for now, or implement rating system
        }));
    } catch (error) {
        console.error("Get Agents Error:", error);
        return [];
    }
}

export async function getAvailableFleetsAction() {
    try {
        return await db.fleetVehicle.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        console.error("Get Fleets Error:", error);
        return [];
    }
}

export async function updateAgentVehicleAction(agentId: string, fleetId: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
    try {
        // Unassign old fleets
        await db.fleetVehicle.updateMany({
            where: { agentId: agentId },
            data: { agentId: null }
        });

        if (fleetId && fleetId !== 'Unassigned') {
            const fleet = await db.fleetVehicle.findUnique({ where: { id: fleetId }});
            if (fleet) {
                await db.fleetVehicle.update({
                    where: { id: fleetId },
                    data: { agentId: agentId }
                });
                await db.user.update({
                    where: { id: agentId },
                    data: { vehicleType: fleet.vehicleType }
                });
            }
        } else {
            await db.user.update({
                where: { id: agentId },
                data: { vehicleType: null }
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Update Vehicle Error:", error);
        return { success: false, error: "Failed to update fleet assignment" };
    }
}

export async function updateAgentLocationAction(agentId: string, lat: number, lng: number): Promise<{ success: boolean; error?: string }> {
    // Only agents themselves or admins can update location
    const session = await getAuthSession();
    if (!session || (session.role !== 'ADMIN' && session.id !== agentId)) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        await db.user.update({
            where: { id: agentId },
            data: {
                currentLat: lat,
                currentLng: lng,
                updatedAt: new Date() // force update
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Update Location Error:", error);
        return { success: false, error: "Failed to update location" };
    }
}


export async function toggleAgentOnlineAction(agentId: string, isOnline: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        await db.user.update({
            where: { id: agentId },
            data: { isOnline }
        });
        return { success: true };
    } catch (error) {
        console.error("Toggle Online Error:", error);
        return { success: false, error: "Failed to update online status" };
    }
}


// --- User Management Actions ---

export async function getUsersAction(): Promise<AuthUser[]> {
    if (!(await isAdmin())) return [];
    try {
        const users = await db.user.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        return users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status // return status as well
        } as AuthUser));
    } catch (error) {
        console.error("Get Users Error:", error);
        return [];
    }
}

export async function toggleUserStatusAction(userId: string, newStatus: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
    try {
        await db.user.update({
            where: { id: userId },
            data: { status: newStatus }
        });
        return { success: true };
    } catch (error) {
        console.error("Toggle Status Error:", error);
        return { success: false, error: "Failed to update status" };
    }
}

export async function changeUserRoleAction(userId: string, newRole: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
    try {
        await db.user.update({
            where: { id: userId },
            data: { role: newRole }
        });
        return { success: true };
    } catch (error) {
        console.error("Change Role Error:", error);
        return { success: false, error: "Failed to update role" };
    }
}

export async function deleteUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
    try {
        await db.user.delete({
            where: { id: userId }
        });
        return { success: true };
    } catch (error) {
        console.error("Delete User Error:", error);
        return { success: false, error: "Failed to delete user" };
    }
}

export async function createCustomerAction(data: { name: string; email: string; phone: string; password: string }): Promise<{ success: boolean; error?: string }> {
    try {
        // Check existing
        const existing = await db.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { phone: data.phone }
                ]
            }
        });

        if (existing) {
            return { success: false, error: "User with this email or phone already exists" };
        }

        // Create CUSTOMER
        await db.user.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                password: data.password,
                role: 'CUSTOMER',
                status: 'ACTIVE'
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Create Customer Error:", error);
        return { success: false, error: "Failed to create customer" };
    }
}




// --- Pricing Config Actions ---
// Admin can add or remove item in Pricing Configuration

export async function createScrapItemAction(data: { name: string; categoryId: string; basePrice: number; currentPrice: number; unit: string; image?: string }): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
    try {
        await db.scrapItem.create({
            data: {
                name: data.name,
                categoryId: data.categoryId,
                basePrice: data.basePrice,
                currentPrice: data.currentPrice,
                unit: data.unit,
                image: data.image
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Create Item Error:", error);
        return { success: false, error: "Failed to create item" };
    }
}

export async function updateScrapItemAction(id: string, data: { name: string; categoryId: string; basePrice: number; currentPrice: number; unit: string; image?: string }): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
    try {
        await db.scrapItem.update({
            where: { id },
            data: {
                name: data.name,
                categoryId: data.categoryId,
                basePrice: data.basePrice,
                currentPrice: data.currentPrice,
                unit: data.unit,
                image: data.image
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Update Item Error:", error);
        return { success: false, error: "Failed to update item" };
    }
}

export async function deleteScrapItemAction(itemId: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
    try {
        await db.scrapItem.delete({
            where: { id: itemId }
        });
        return { success: true };
    } catch (error) {
        console.error("Delete Item Error:", error);
        return { success: false, error: "Failed to delete item" };
    }
}

export async function getCategoriesAction() {
    try {
        return await db.scrapCategory.findMany();
    } catch (error) {
        return [];
    }
}
// --- Booking / Pickup Actions ---
// ... existing code ...

export async function getUserActiveBookingAction(userId: string) {
    const session = await getAuthSession();
    if (!session || (session.role !== 'ADMIN' && session.id !== userId)) return null;
    try {
        const booking = await db.booking.findFirst({
            where: {
                userId: userId,
                status: {
                    in: ['PENDING', 'ASSIGNED', 'ARRIVING', 'IN_PROGRESS']
                }
            },
            include: {
                agent: true,
                address: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return booking;
    } catch (error) {
        console.error("Get User Booking Error:", error);
        return null;
    }
}

// --- Admin Booking Actions ---

export async function assignAgentToBookingAction(bookingId: string, agentId: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
    try {
        // Concurrency Check: Ensure booking isn't already taken
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            select: { agentId: true, status: true }
        });

        if (booking?.agentId && booking.agentId !== agentId) {
            return { success: false, error: "This pickup has already been accepted by another agent." };
        }

        await db.booking.update({
            where: { id: bookingId },
            data: {
                agentId: agentId,
                status: 'ASSIGNED' // Auto update status to ASSIGNED when agent is linked
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Assign Agent Error:", error);
        return { success: false, error: "Failed to assign agent" };
    }
}

export async function updateBookingStatusAction(bookingId: string, status: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isAgent())) return { success: false, error: "Unauthorized" };
    try {
        await db.booking.update({
            where: { id: bookingId },
            data: { status }
        });
        return { success: true };
    } catch (error) {
        console.error("Update Status Error:", error);
        return { success: false, error: "Failed to update status" };
    }
}

export async function getAllBookingsAction() {
    if (!(await isAgent())) return [];
    try {
        const bookings = await db.booking.findMany({
            include: {
                agent: true,
                address: true,
                user: true, // Include customer details
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
        return bookings;
    } catch (error) {
        console.error("Get All Bookings Error:", error);
        return [];
    }
}

// Helper for distance calculation (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function findNearestAgent(lat: number, lng: number, maxDistanceKm: number = 100): Promise<string | null> {
    try {
        console.log(`[AutoAssign] Searching for agent near ${lat}, ${lng} (Radius: ${maxDistanceKm}km)`);
        const agents = await db.user.findMany({
            where: {
                role: 'AGENT',
                status: 'ACTIVE',
                isOnline: true,
                currentLat: { not: null },
                currentLng: { not: null }
            }
        });

        console.log(`[AutoAssign] Found ${agents.length} online agents with location.`);

        let nearestAgentId = null;
        let minDistance = maxDistanceKm;

        for (const agent of agents) {
            const distance = calculateDistance(lat, lng, agent.currentLat!, agent.currentLng!);
            console.log(`[AutoAssign] Agent ${agent.name} is ${distance.toFixed(2)}km away`);
            if (distance < minDistance) {
                minDistance = distance;
                nearestAgentId = agent.id;
            }
        }

        if (nearestAgentId) {
            console.log(`[AutoAssign] Winner: Agent ID ${nearestAgentId} at ${minDistance.toFixed(2)}km`);
        } else {
            console.log(`[AutoAssign] No agent found within ${maxDistanceKm}km`);
        }

        return nearestAgentId;
    } catch (error) {
        console.error("Find Nearest Agent Error:", error);
        return null;
    }
}

export async function getAgentTasksAction(agentId: string, agentLat?: number, agentLng?: number) {
    const session = await getAuthSession();
    if (!session || (session.role !== 'ADMIN' && session.id !== agentId)) {
        return { available: [], accepted: [], completed: [] };
    }
    try {
        console.log(`[FORENSIC] getAgentTasksAction called for ID: "${agentId}"`);
        
        // Fetch bookings that are either assigned to this agent OR are PENDING (potential pool)
        // We fetch ALL pending to avoid missing those with empty strings or missing fields in Mongo
        const bookings = await db.booking.findMany({
            where: {
                OR: [
                    { agentId: agentId },
                    { status: 'PENDING' }
                ]
            },
            include: {
                user: true,
                address: true,
                items: {
                    include: {
                        item: {
                            include: {
                                category: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Haversine distance calculation is already used in calculateDistance helper

        // Add distance to each booking
        const bookingsWithDistance = bookings.map(b => {
            let distance = 0;
            if (agentLat && agentLng && b.pickupLat && b.pickupLng) {
                distance = calculateDistance(agentLat, agentLng, b.pickupLat, b.pickupLng);
            }
            return { ...b, distance };
        });

        console.log(`[AgentTasks] Total bookings fetched: ${bookings.length}`);
        console.log(`[AgentTasks] Filtering for agentId: ${agentId}`);

        // 1. Available: PENDING status AND no agent assigned
        const available = bookingsWithDistance.filter(b =>
            b.status === 'PENDING' &&
            (!b.agentId || String(b.agentId).trim() === "" || b.agentId === null)
        );

        // 2. Accepted: Assigned to THIS agent AND status is NOT COMPLETED or CANCELLED
        const acceptedRaw = bookingsWithDistance.filter(b =>
            b.agentId && String(b.agentId) === String(agentId) &&
            !['COMPLETED', 'CANCELLED'].includes(b.status)
        );

        console.log(`[AgentTasks] Found ${available.length} available, ${acceptedRaw.length} accepted`);

        // 3. Completed: Assigned to THIS agent AND status is COMPLETED
        const completed = bookingsWithDistance.filter(b =>
            b.agentId && String(b.agentId) === String(agentId) &&
            b.status === 'COMPLETED'
        );

        // Route Optimization for Accepted Tasks (Nearest Neighbor)
        const optimizedAccepted = [];
        let remainingAccepted = [...acceptedRaw];
        let currentLat = agentLat;
        let currentLng = agentLng;

        while (remainingAccepted.length > 0) {
            if (currentLat === undefined || currentLng === undefined) {
                optimizedAccepted.push(...remainingAccepted);
                break;
            }

            let nearestIndex = 0;
            let minDistance = Infinity;

            for (let i = 0; i < remainingAccepted.length; i++) {
                const d = calculateDistance(currentLat, currentLng, remainingAccepted[i].pickupLat, remainingAccepted[i].pickupLng);
                if (d < minDistance) {
                    minDistance = d;
                    nearestIndex = i;
                }
            }

            const nearest = remainingAccepted.splice(nearestIndex, 1)[0];
            optimizedAccepted.push(nearest);
            currentLat = nearest.pickupLat;
            currentLng = nearest.pickupLng;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayCompleted = completed.filter(b => b.updatedAt >= today);
        const todayEarnings = todayCompleted.reduce((acc, b) => acc + (b.totalAmount || 0), 0);

        console.log(`[FORENSIC] Result for ${agentId}: ${available.length} avail, ${optimizedAccepted.length} acc, ${completed.length} comp, Today Earnings: ${todayEarnings}`);

        return {
            available: available.sort((a, b) => a.distance - b.distance),
            accepted: optimizedAccepted,
            completed: completed,
            summary: {
                todayEarnings,
                todayCompleted: todayCompleted.length,
                assignedCount: optimizedAccepted.length
            }
        };
    } catch (error) {
        console.error("Get Agent Tasks Error:", error);
        return { available: [], accepted: [], completed: [] };
    }
}

export async function getBookingAgentLocationAction(bookingId: string) {
    // Basic verification: user must be logged in to track their booking
    const session = await getAuthSession();
    if (!session) return null;
    try {
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            select: {
                agentId: true,
                status: true,
                pickupLat: true,
                pickupLng: true,
                agent: {
                    select: {
                        currentLat: true,
                        currentLng: true,
                        name: true,
                        phone: true,
                        isOnline: true
                    }
                }
            }
        });

        if (!booking || !booking.agentId) return booking;

        // Fetch active bookings for this agent to calculate queue
        const activeBookings = await db.booking.findMany({
            where: {
                agentId: booking.agentId,
                status: {
                    in: ['ASSIGNED', 'ONEWAY', 'ARRIVED', 'WEIGHED', 'PAID']
                }
            },
            orderBy: {
                updatedAt: 'asc'
            },
            select: { id: true, status: true }
        });

        const queuePosition = activeBookings.findIndex(b => b.id === bookingId);

        return {
            ...booking,
            queuePosition: queuePosition >= 0 ? queuePosition : 0,
            activeBookingsCount: activeBookings.length
        };
    } catch (error) {
        console.error("Get Agent Location Error:", error);
        return null;
    }
}

export async function getBookingByIdAction(bookingId: string) {
    const session = await getAuthSession();
    if (!session) return null;
    try {
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: {
                user: true,
                address: true,
                items: {
                    include: {
                        item: true
                    }
                }
            }
        });
        return booking;
    } catch (error) {
        console.error("Get Booking Error:", error);
        return null;
    }
}

export async function createBookingAction(userId: string, data: { items: { id: string, qty: number }[], schedule: { date: string, time: string }, location: { lat: number, lng: number, address: string }, totalAmount: number, remarks?: string }): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    const session = await getAuthSession();
    if (!session || (session.role !== 'ADMIN' && session.id !== userId)) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        console.log(`[Booking] Creating booking for user ${userId}`);
        console.log(`[Booking] Schedule: ${data.schedule.date} at ${data.schedule.time}`);

        // Fetch current item prices to lock them in
        const itemIds = data.items.map(i => i.id);
        const allItems = await db.scrapItem.findMany({
            where: { id: { in: itemIds } }
        });

        // Create Address first
        const address = await db.address.create({
            data: {
                userId: userId,
                street: data.location.address,
                city: 'Unknown',
                state: 'Unknown',
                zip: '000000',
                lat: data.location.lat,
                lng: data.location.lng
            }
        });

        // Parse scheduledAt properly - preserve the exact time without timezone conversion
        const scheduledDate = new Date(`${data.schedule.date}T${data.schedule.time}:00`);

        console.log(`[Booking] Input: ${data.schedule.date} at ${data.schedule.time}`)
        console.log(`[Booking] Stored as: ${scheduledDate.toISOString()}`);

        const booking = await db.booking.create({
            data: {
                userId: userId,
                addressId: address.id,
                status: 'PENDING',
                scheduledAt: scheduledDate,
                totalAmount: data.totalAmount,
                pickupLat: data.location.lat,
                pickupLng: data.location.lng,
                remarks: data.remarks,
                items: {
                    create: data.items.map(i => {
                        const itemDetail = allItems.find(dbItem => dbItem.id === i.id);
                        return {
                            itemId: i.id,
                            quantity: i.qty,
                            priceAtBooking: itemDetail?.currentPrice || 0
                        };
                    })
                }
            }
        });

        console.log(`[Booking] Created booking ${booking.id}`);

        // AUTO-ASSIGNMENT LOGIC
        const nearestAgentId = await findNearestAgent(data.location.lat, data.location.lng, 5);
        if (nearestAgentId) {
            console.log(`[AutoAssign] Assigning booking ${booking.id} to agent ${nearestAgentId}`);
            await db.booking.update({
                where: { id: booking.id },
                data: {
                    agentId: nearestAgentId,
                    status: 'ASSIGNED'
                }
            });
            // Create a notification for the agent if needed
            await db.notification.create({
                data: {
                    userId: nearestAgentId,
                    title: 'New Pickup Assigned',
                    message: `You have been assigned a new pickup at ${data.location.address}`,
                    type: 'SUCCESS'
                }
            });


        }

        return { success: true, bookingId: booking.id };
    } catch (error) {
        console.error("[Booking] Create Booking Error:", error);
        return { success: false, error: "Failed to create booking" };
    }
}

// NEW: Clear all user bookings (for customer history reset)
export async function clearUserBookingsAction(userId: string): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    const session = await getAuthSession();
    if (!session || (session.role !== 'ADMIN' && session.id !== userId)) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        console.log(`[Booking] Clearing all bookings for user ${userId}`);

        // Delete all booking items first (due to foreign key constraints)
        const bookingsToDelete = await db.booking.findMany({
            where: { userId: userId },
            select: { id: true }
        });

        for (const booking of bookingsToDelete) {
            await db.bookingItem.deleteMany({
                where: { bookingId: booking.id }
            });
        }

        // Then delete all bookings
        const result = await db.booking.deleteMany({
            where: { userId: userId }
        });

        console.log(`[Booking] Deleted ${result.count} bookings for user ${userId}`);
        return { success: true, deletedCount: result.count };
    } catch (error) {
        console.error("[Booking] Clear Bookings Error:", error);
        return { success: false, error: "Failed to clear bookings" };
    }
}

export async function cancelBookingAction(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    try {
        // If not admin, check if it's their booking
        if (session.role !== 'ADMIN') {
            const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { userId: true } });
            if (booking?.userId !== session.id) return { success: false, error: "Unauthorized" };
        }
        await db.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' }
        });
        return { success: true };
    } catch (error) {
        console.error("Cancel Booking Error:", error);
        return { success: false, error: "Failed to cancel booking" };
    }
}

export async function deleteBookingAction(bookingId: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
    try {
        await db.bookingItem.deleteMany({
            where: { bookingId: bookingId }
        });
        await db.walletTransaction.deleteMany({
             where: { reference: bookingId, description: { contains: 'Payout' } }
        });
        await db.review.deleteMany({
             where: { bookingId: bookingId }   
        });
        await db.booking.delete({
            where: { id: bookingId }
        });
        return { success: true };
    } catch (error) {
        console.error("Delete Booking Error:", error);
        return { success: false, error: "Failed to delete booking" };
    }
}

export async function getUserBookingsAction(userId: string) {
    const session = await getAuthSession();
    if (!session || (session.role !== 'ADMIN' && session.id !== userId)) return [];
    try {
        const bookings = await db.booking.findMany({
            where: { userId: userId },
            include: {
                agent: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        currentLat: true,
                        currentLng: true,
                        isOnline: true
                    }
                },
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
        return bookings;
    } catch (error) {
        console.error("Get User Bookings Error:", error);
        return [];
    }
}

// --- Dashboard & Wallet --

export async function getUserDashboardStatsAction(userId: string) {
    const session = await getAuthSession();
    if (!session || (session.role !== 'ADMIN' && session.id !== userId)) {
        return { totalEarnings: 0, growthPercentage: 0, recentActivity: [] };
    }
    try {
        const [user, bookings] = await Promise.all([
            db.user.findUnique({
                where: { id: userId },
                select: { walletBalance: true }
            }),
            db.booking.findMany({
                where: { userId: userId },
                include: { review: { select: { id: true } } },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Use real-time wallet balance
        const totalEarnings = user?.walletBalance || 0;

        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        // Simple mock calculation for "from last month" as we don't have enough data
        const growthPercentage = 0;

        return {
            totalEarnings,
            growthPercentage,
            recentActivity: bookings.slice(0, 5).map(b => ({
                id: b.id,
                status: b.status,
                date: b.createdAt,
                amount: b.totalAmount || 0,
                // generate a stable "hash" based on ID for color coding if needed
                hash: b.id.substring(0, 6),
                hasReview: !!b.review
            }))
        };
    } catch (error) {
        console.error("Get Stats Error:", error);
        return { totalEarnings: 0, growthPercentage: 0, recentActivity: [] };
    }
}

export async function withdrawFundsAction(userId: string, amount: number, method: string): Promise<{ success: boolean; error?: string }> {
    const session = await getAuthSession();
    if (!session || (session.role !== 'ADMIN' && session.id !== userId)) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        // In a real app, this would check wallet balance, creating a transaction record, etc.
        // For now, we'll verify the user exists and "simulate" a success.

        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) return { success: false, error: "User not found" };

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        return { success: true };
    } catch (error) {
        console.error("Withdraw Error:", error);
        return { success: false, error: "Withdrawal failed" };
    }
}

// --- Analytics Actions ---

export async function getUserAnalyticsAction() {
    if (!(await isAdmin())) return { newUsersToday: 0, activeUsers: 0, totalUsers: 0, repeatRate: 0, growthData: [] };
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. New Users Today
        const newUsersToday = await db.user.count({
            where: {
                role: 'CUSTOMER',
                createdAt: { gte: today }
            }
        });

        // 2. Active Users (Updated in last 30 days) - Proxy for active
        const activeUsers = await db.user.count({
            where: {
                role: 'CUSTOMER',
                updatedAt: { gte: thirtyDaysAgo }
            }
        });

        const totalUsers = await db.user.count({
            where: { role: 'CUSTOMER' }
        });

        // 3. Repeat Customers Rate
        // Get all customers with 'COMPLETED' bookings
        const bookings = await db.booking.findMany({
            where: { status: 'COMPLETED' },
            select: { userId: true }
        });

        // Count bookings per user
        const userBookingCounts: Record<string, number> = {};
        bookings.forEach(b => {
            userBookingCounts[b.userId] = (userBookingCounts[b.userId] || 0) + 1;
        });

        const customersWithBookings = Object.keys(userBookingCounts).length;
        const repeatCustomers = Object.values(userBookingCounts).filter(count => count > 1).length;

        const repeatRate = customersWithBookings > 0
            ? Math.round((repeatCustomers / customersWithBookings) * 100)
            : 0;

        // 4. User Growth Chart (Cumulative)
        // Fetch all customer creation dates
        const users = await db.user.findMany({
            where: { role: 'CUSTOMER' },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' }
        });

        const dateMap = new Map<string, number>();
        let cumulative = 0;
        const growthData: { date: string, users: number }[] = [];

        if (users.length > 0) {
            let currentTotal = 0;
            // Create set of unique dates "Jan 1", "Jan 2" etc
            const uniqueDates = Array.from(new Set(users.map(u => u.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))));

            uniqueDates.forEach(dateStr => {
                const countForDay = users.filter(u => u.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr).length;
                currentTotal += countForDay;
                growthData.push({ date: dateStr, users: currentTotal });
            });
        }

        if (growthData.length === 0) {
            growthData.push({ date: 'Today', users: 0 });
        }

        return {
            newUsersToday,
            activeUsers,
            totalUsers,
            repeatRate,
            growthData
        };

    } catch (error) {
        console.error("User Analytics Error:", error);
        return {
            newUsersToday: 0,
            activeUsers: 0,
            totalUsers: 0,
            repeatRate: 0,
            growthData: []
        };
    }
}

// Revenue Analytics
export async function getRevenueAnalyticsAction() {
    if (!(await isAdmin())) return { totalRevenue: 0, avgRevenue: 0, revenueTrend: [], revenueByCity: [] };
    try {
        const completedBookings = await db.booking.findMany({
            where: { status: 'COMPLETED' },
            select: {
                totalAmount: true,
                createdAt: true,
                address: { select: { city: true } },
                items: {
                    include: {
                        item: {
                            include: { category: true }
                        }
                    }
                }
            }
        });

        const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const avgRevenue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

        // Daily Trend (Last 7 Days)
        const trendMap = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const day = date.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...
            trendMap.set(day, 0);
        }

        completedBookings.forEach(b => {
            const day = b.createdAt.toLocaleDateString('en-US', { weekday: 'short' });
            if (trendMap.has(day)) {
                trendMap.set(day, (trendMap.get(day) || 0) + (b.totalAmount || 0));
            }
        });

        const revenueTrend = Array.from(trendMap.entries()).map(([name, revenue]) => ({ name, revenue }));

        // City Breakdown
        const cityMap = new Map<string, number>();
        completedBookings.forEach(b => {
            const city = b.address?.city || 'Unknown';
            cityMap.set(city, (cityMap.get(city) || 0) + (b.totalAmount || 0));
        });
        const revenueByCity = Array.from(cityMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // Scrap Type Breakdown
        const categoryMap = new Map<string, number>();
        completedBookings.forEach(booking => {
            booking.items.forEach(bi => {
                const catName = bi.item.category.name;
                // Fallback to currentPrice if recorded price is 0 (legacy/bug fix)
                const price = bi.priceAtBooking > 0 ? bi.priceAtBooking : bi.item.currentPrice;
                const value = bi.quantity * price;
                categoryMap.set(catName, (categoryMap.get(catName) || 0) + value);
            });
        });

        const revenueByScrap = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

        return {
            totalRevenue,
            avgRevenue,
            revenueTrend,
            revenueByCity,
            revenueByScrap
        };
    } catch (error) {
        console.error("Revenue Analytics Error:", error);
        return { totalRevenue: 0, avgRevenue: 0, revenueTrend: [], revenueByCity: [], revenueByScrap: [] };
    }
}

// Operations Analytics
export async function getOperationsAnalyticsAction() {
    try {
        const allBookings = await db.booking.findMany({
            select: { status: true, scheduledAt: true, updatedAt: true, createdAt: true }
        });

        const total = allBookings.length;
        const completed = allBookings.filter(b => b.status === 'COMPLETED').length;
        const cancelled = allBookings.filter(b => b.status === 'CANCELLED').length;

        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

        // Peak Hours
        const hourMap = new Map<string, number>();
        allBookings.forEach(b => {
            // Handle potential invalid dates if any
            if (b.scheduledAt) {
                const hour = b.scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }); // 10 AM
                hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
            }
        });

        const peakHours = Array.from(hourMap.entries())
            .map(([hour, pickups]) => ({ hour, pickups }))
            .sort((a, b) => b.pickups - a.pickups)
            .slice(0, 6);

        return {
            completionRate,
            cancellationRate,
            peakHours,
            avgPickupTime: 'N/A', // Cannot calculate accurately without start/end times
            totalBookings: total
        };
    } catch (error) {
        console.error("Ops Analytics Error:", error);
        return { completionRate: 0, cancellationRate: 0, peakHours: [], avgPickupTime: 'N/A', totalBookings: 0 };
    }
}

// Agent Analytics
export async function getAgentAnalyticsAction() {
    try {
        const agents = await db.user.findMany({
            where: { role: 'AGENT' },
            include: {
                assignedBookings: {
                    where: { status: 'COMPLETED' },
                    select: { totalAmount: true }
                },
                reviewsReceived: {
                    select: { rating: true }
                }
            }
        });

        const agentStats = agents.map(a => {
            const pickups = a.assignedBookings.length;
            const revenue = a.assignedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

            // Calculate real rating
            const totalRating = a.reviewsReceived.reduce((sum, r) => sum + r.rating, 0);
            const avgAgentRating = a.reviewsReceived.length > 0 ? (totalRating / a.reviewsReceived.length).toFixed(1) : 'N/A';

            return {
                id: a.id,
                name: a.name || 'Unknown',
                pickups,
                revenue,
                rating: avgAgentRating, // Real rating
                onTime: 'N/A' // Cannot calculate without arrival timestamps
            };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

        const totalRevenue = agents.reduce((sum, a) => {
            return sum + a.assignedBookings.reduce((bookingSum, b) => bookingSum + (b.totalAmount || 0), 0);
        }, 0);

        const avgRevenue = agents.length > 0 ? totalRevenue / agents.length : 0;

        // Calculate overall average rating
        const allRatings = agents.flatMap(a => a.reviewsReceived.map(r => r.rating));
        const overallAvgRating = allRatings.length > 0
            ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
            : 0;

        return {
            topAgents: agentStats,
            avgRating: overallAvgRating,
            avgRevenue: Math.round(avgRevenue),
            totalAgents: agents.length
        };
    } catch (error) {
        console.error("Agent Analytics Error:", error);
        return { topAgents: [], avgRating: 0, avgRevenue: 0, totalAgents: 0 };
    }
}

// Scrap Insights
export async function getScrapInsightsAction() {
    try {
        const items = await db.bookingItem.findMany({
            where: { booking: { status: 'COMPLETED' } },
            include: { item: true }
        });

        let totalWeight = 0;
        const weightMap = new Map<string, number>();

        items.forEach(i => {
            totalWeight += i.quantity;
            const name = i.item.name;
            weightMap.set(name, (weightMap.get(name) || 0) + i.quantity);
        });

        const weightByType = Array.from(weightMap.entries())
            .map(([name, weight]) => ({ name, weight }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 5);

        const totalBookings = await db.booking.count({ where: { status: 'COMPLETED' } });
        const avgWeight = totalBookings > 0 ? Math.round(totalWeight / totalBookings) : 0;

        return {
            totalWeight: Math.round(totalWeight),
            avgWeight,
            weightByType
        };
    } catch (error) {
        console.error("Scrap Insights Error:", error);
        return { totalWeight: 0, avgWeight: 0, weightByType: [] };
    }
}

export async function submitReviewAction(bookingId: string, rating: number, comment?: string): Promise<{ success: boolean; error?: string }> {
    try {
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: { review: true }
        });

        if (!booking) return { success: false, error: "Booking not found" };
        if (booking.status !== 'COMPLETED') return { success: false, error: "Booking is not completed yet" };
        if (booking.review) return { success: false, error: "Review already submitted" };
        if (!booking.agentId) return { success: false, error: "No agent assigned to this booking" };

        await db.review.create({
            data: {
                rating,
                comment,
                bookingId: booking.id,
                customerId: booking.userId,
                agentId: booking.agentId
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Submit Review Error:", error);
        return { success: false, error: "Failed to submit review" };
    }
}


export async function payBookingAction(bookingId: string, data: { items: any[], photos: string[], totalAmount: number, customerWalletId: string }) {
    try {
        console.log(`[PAY] Starting payment for booking ${bookingId}, amount: ${data.totalAmount}`);

        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: { user: true }
        });

        if (!booking) return { success: false, error: "Booking not found" };
        if (booking.status === 'COMPLETED' || booking.status === 'PAID') return { success: false, error: "Already completed" };

        // Validate items
        if (!data.items || data.items.length === 0) {
            return { success: false, error: "No items provided" };
        }

        // Validate totalAmount
        const amount = parseFloat(String(data.totalAmount));
        if (isNaN(amount) || amount <= 0) {
            return { success: false, error: "Invalid payment amount" };
        }

        // 1. Update Booking Items with actual weights
        console.log(`[PAY] Deleting old items for booking ${bookingId}`);
        await db.bookingItem.deleteMany({ where: { bookingId } });
        
        const validItems = data.items.filter(item => item.itemId && !isNaN(parseFloat(item.weight)));
        console.log(`[PAY] Creating ${validItems.length} booking items`);
        if (validItems.length > 0) {
            // Use individual create calls - createMany has known issues with Prisma+MongoDB
            await Promise.all(validItems.map(item =>
                db.bookingItem.create({
                    data: {
                        bookingId,
                        itemId: item.itemId,
                        quantity: parseFloat(item.weight),
                        priceAtBooking: parseFloat(String(item.price || 0))
                    }
                })
            ));
        }

        // 2. Wallet Transfer
        console.log(`[PAY] Incrementing wallet balance for user ${booking.userId}`);
        await db.user.update({
            where: { id: booking.userId },
            data: {
                walletBalance: { increment: amount }
            }
        });

        // Create Transaction — use ?? undefined to avoid passing null to ObjectId field
        await db.walletTransaction.create({
            data: {
                userId: booking.userId,
                amount: amount,
                type: 'CREDIT',
                reference: booking.id,
                description: `Payout for Pickup #${booking.id.slice(-6).toUpperCase()}`,
                relatedUserId: booking.agentId ?? undefined
            }
        });

        // 3. Update Booking Status and Evidence
        await db.booking.update({
            where: { id: bookingId },
            data: {
                status: 'COMPLETED',
                totalAmount: amount,
                evidenceImages: data.photos || []
            }
        });

        // 4. Send Notification to User
        await db.notification.create({
            data: {
                userId: booking.userId,
                title: 'Money Received! 💰',
                message: `You received ₹${amount.toFixed(2)} for your scrap pickup.`,
                type: 'SUCCESS'
            }
        });


        console.log(`[PAY] Payment success for booking ${bookingId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Pay Booking Error:", error?.message || error);
        return { success: false, error: error?.message || "Failed to process payment" };
    }
}



export async function proximityAlertAction(bookingId: string, distance: number) {
    try {
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: { user: true }
        });
        if (!booking) return { success: false };

        if (distance < 10) { // If within 10 meters, notify
             await db.notification.create({
                data: {
                    userId: booking.userId,
                    title: 'Agent is Arriving! 📍',
                    message: `Your Loopy agent is only ${distance.toFixed(0)}m away.`,
                    type: 'INFO'
                }
            });

        }
        return { success: true };

    } catch (error) {
        return { success: false };
    }
}

// --- NEW CRUD ACTIONS ---

export async function createCompanyAction(data: { name: string, type: string, contactEmail?: string, contactPhone?: string }) {
    try {
        const company = await db.company.create({ data });
        return { success: true, company };
    } catch(e: any) {
        return { success: false, error: e.message };
    }
}

export async function getCompaniesAction() {
    return await db.company.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function updateCompanyAction(id: string, data: Partial<{ name: string, type: string, contactEmail: string, contactPhone: string }>) {
    try {
        const company = await db.company.update({ where: { id }, data });
        return { success: true, company };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteCompanyAction(id: string) {
    try {
        await db.company.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createWarehouseAction(data: { name: string, location: string, capacity?: number, lat?: number, lng?: number }) {
    try {
        const warehouse = await db.warehouse.create({ 
            data: {
                ...data,
                capacity: data.capacity ? Number(data.capacity) : undefined,
                lat: data.lat ? Number(data.lat) : undefined,
                lng: data.lng ? Number(data.lng) : undefined
            } 
        });
        return { success: true, warehouse };
    } catch(e: any) {
        return { success: false, error: e.message };
    }
}

export async function getWarehousesAction() {
    return await db.warehouse.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function updateWarehouseAction(id: string, data: Partial<{ name: string, location: string, capacity: number, status: string, lat: number, lng: number }>) {
    try {
        const warehouse = await db.warehouse.update({ 
            where: { id }, 
            data: {
                ...data,
                capacity: data.capacity !== undefined ? Number(data.capacity) : undefined,
                lat: data.lat !== undefined ? Number(data.lat) : undefined,
                lng: data.lng !== undefined ? Number(data.lng) : undefined
            } 
        });
        return { success: true, warehouse };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteWarehouseAction(id: string) {
    try {
        await db.warehouse.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createFleetVehicleAction(data: { name: string, licensePlate: string, vehicleType: string, capacityKg?: number }) {
    try {
        const vehicle = await db.fleetVehicle.create({ data });
        return { success: true, vehicle };
    } catch(e: any) {
        return { success: false, error: e.message };
    }
}

export async function getFleetVehiclesAction() {
    return await db.fleetVehicle.findMany({ orderBy: { createdAt: 'desc' }, include: { agent: true } });
}

export async function updateFleetVehicleAction(id: string, data: Partial<{ name: string, licensePlate: string, vehicleType: string, status: string, agentId: string | null, capacityKg: number | null }>) {
    try {
        const vehicle = await db.fleetVehicle.update({ where: { id }, data });
        return { success: true, vehicle };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteFleetVehicleAction(id: string) {
    try {
        await db.fleetVehicle.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createLocationZoneAction(data: { name: string, region: string, lat?: number, lng?: number, radiusKm?: number }) {
    try {
        const zone = await db.locationZone.create({ 
            data: {
                ...data,
                lat: data.lat ? Number(data.lat) : undefined,
                lng: data.lng ? Number(data.lng) : undefined,
                radiusKm: data.radiusKm ? Number(data.radiusKm) : undefined
            } 
        });
        return { success: true, zone };
    } catch(e: any) {
        return { success: false, error: e.message };
    }
}

export async function getLocationZonesAction() {
    return await db.locationZone.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function updateLocationZoneAction(id: string, data: Partial<{ name: string, region: string, status: string, lat: number, lng: number, radiusKm: number }>) {
    try {
        const zone = await db.locationZone.update({ 
            where: { id }, 
            data: {
                ...data,
                lat: data.lat !== undefined ? Number(data.lat) : undefined,
                lng: data.lng !== undefined ? Number(data.lng) : undefined,
                radiusKm: data.radiusKm !== undefined ? Number(data.radiusKm) : undefined
            } 
        });
        return { success: true, zone };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteLocationZoneAction(id: string) {
    try {
        await db.locationZone.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
