import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

// Get user's tickets
export async function GET(request: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tickets = await db.supportTicket.findMany({
            where: session.role === 'ADMIN' ? {} : { userId: session.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                user: {
                    select: { name: true, email: true, phone: true }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        return NextResponse.json(tickets);
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// Create new ticket
export async function POST(request: Request) {
    try {
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subject, message } = await request.json();

        if (!subject || !message) {
            return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
        }

        const ticket = await db.supportTicket.create({
            data: {
                userId: session.id,
                subject,
                messages: {
                    create: {
                        senderId: session.id,
                        text: message,
                        isAdmin: false
                    }
                }
            },
            include: {
                messages: true
            }
        });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error("Support Ticket API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
