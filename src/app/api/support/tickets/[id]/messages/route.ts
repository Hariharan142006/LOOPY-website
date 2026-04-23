import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getAuthSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const messages = await db.supportMessage.findMany({
            where: { ticketId: id },
            orderBy: { createdAt: 'asc' }
        });

        // Verify user owns the ticket or is admin
        const ticket = await db.supportTicket.findUnique({
            where: { id }
        });

        if (!ticket || (ticket.userId !== session.id && session.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json(messages);
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

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

        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
        }

        const isAdmin = session.role === 'ADMIN';

        const message = await db.supportMessage.create({
            data: {
                ticketId: id,
                senderId: session.id,
                text,
                isAdmin: isAdmin
            }
        });

        // Get the ticket to find the participant
        const ticket = await db.supportTicket.findUnique({
            where: { id }
        });

        if (ticket) {
            if (isAdmin) {
                // Admin replied -> Notify customer
                await db.notification.create({
                    data: {
                        userId: ticket.userId,
                        title: 'New Support Message',
                        message: `Admin replied: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
                        type: 'INFO',
                        relatedId: params.id
                    }
                });
            } else {
                // Customer wrote -> Notify admins
                const admins = await db.user.findMany({
                    where: { role: 'ADMIN' },
                    select: { id: true }
                });

                for (const admin of admins) {
                    await db.notification.create({
                        data: {
                            userId: admin.id,
                            title: 'New Support Required',
                            message: `Ticket #${id.slice(-6).toUpperCase()}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
                            type: 'WARNING',
                            relatedId: id
                        }
                    });
                }
            }
        }

        // Update ticket's updatedAt for sorting
        await db.supportTicket.update({
            where: { id },
            data: { updatedAt: new Date() }
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error("Support Message API Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
