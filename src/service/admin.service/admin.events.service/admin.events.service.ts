//admin.events.service

import { NotificationType } from '@prisma/client';
import { CreateNewEventSchema, UpdateEventSchema } from '../../../schema/admin.dto/admin.event.dto/admin.event.dto';
import { customError } from '../../../utils/customError';

import { db } from '../../../utils/db.server';

export async function createEvent(start: string, end: string, data: CreateNewEventSchema['body']['data']) {
    const event = await db.event.create({
        data: {
            start: new Date(start),
            end: new Date(end),
            data: {
                create: {
                    ...data.appointment
                }
            }
        },
        include: {
            data: true
        }
    });

    const activeStudents = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: true
        },
        select: {
            id: true
        }
    });
    const notificationPromises = activeStudents.map((student) =>
        db.notification.create({
            data: {
                studentId: student.id,
                type: NotificationType.EVENT,
                title: 'New Event',
                content: `A new event "${data.appointment.title}" has been scheduled from ${start} to ${end}.`,
                actionUrl: `/student?studentId=${student.id}`
            }
        })
    );

    // Execute all notification creations
    await Promise.all(notificationPromises);

    return event;
}

export async function getAllEvents() {
    const events = await db.event.findMany({
        include: {
            data: true
        }
    });
    return events;
}

export async function updateEvent(eventId: string, start: string, end: string, data: UpdateEventSchema['body']['data']) {
    const event = await db.event.update({
        where: { id: +eventId },
        data: {
            start: new Date(start),
            end: new Date(end),
            data: {
                update: {
                    ...data.appointment
                }
            }
        },
        include: {
            data: true
        }
    });

    return event;
}

export async function deleteEvent(eventId: string) {
    const event = await db.event.delete({
        where: { id: +eventId }
    });
    return event;
}
