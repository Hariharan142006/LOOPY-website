import { db } from './db';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'INFO',
  relatedId?: string
) {
  try {
    return await db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        relatedId
      }
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}
