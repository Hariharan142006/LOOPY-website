import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { updateAgentLocationAction } from '@/app/actions';

export async function POST(request: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'AGENT') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { lat, lng } = body;

        if (lat === undefined || lng === undefined) {
            return NextResponse.json({ error: 'Coordinates required' }, { status: 400 });
        }

        const result = await updateAgentLocationAction(session.id, lat, lng);
        
        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Agent Location Update API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
