import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { payBookingAction } from '@/app/actions';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'AGENT' && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { items, photos, totalAmount, customerWalletId } = body;

        const result = await payBookingAction(id, { items, photos, totalAmount, customerWalletId });

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: result.error || 'Payment failed' }, { status: 400 });
        }

    } catch (error) {
        console.error("Payment API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
