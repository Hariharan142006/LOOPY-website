import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getAgentTasksAction } from '@/app/actions';
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'forensic.log');
function auditLog(msg: string) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, entry);
    console.log(msg);
}

export async function GET(request: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'AGENT' && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Default to no location for simple GET
        console.log(`[ROUTE] GET /api/agent/tasks for ID: "${session.id}"`);
        const result = await getAgentTasksAction(session.id);

        // Return structured data
        return NextResponse.json(result);
    } catch (error) {
        console.error("Agent Tasks GET Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'AGENT' && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { lat, lng, date } = body;

        const result = await getAgentTasksAction(session.id, lat, lng, date);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Agent Tasks POST Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
