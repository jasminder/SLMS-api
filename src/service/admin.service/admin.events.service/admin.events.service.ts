//admin.events.service

import { CreateNewEventSchema } from '../../../schema/admin.dto/admin.event.dto/admin.event.dto';
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

    return event;
}
