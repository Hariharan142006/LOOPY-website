import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: session.id },
            select: {
                walletBalance: true,
                transactions: {
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Calculate some simplified stats for the dashboard
        const totalKgRecycled = await db.bookingItem.aggregate({
            where: { booking: { userId: session.id, status: 'COMPLETED' } },
            _sum: { quantity: true }
        });

        return NextResponse.json({
            balance: user.walletBalance,
            transactions: user.transactions,
            impact: {
                kgRecycled: totalKgRecycled._sum.quantity || 0,
                co2Saved: (totalKgRecycled._sum.quantity || 0) * 2.5 // Mock multiplier
            }
        });
    } catch (error) {
        console.error("Wallet API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
