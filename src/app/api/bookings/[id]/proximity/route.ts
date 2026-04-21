import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { proximityAlertAction } from '@/app/actions';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getAuthSession();

        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (session.role !== 'AGENT') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { distance } = body;

        const result = await proximityAlertAction(id, distance);

        return NextResponse.json({ success: result.success });
    } catch (error) {
        console.error("Proximity API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
