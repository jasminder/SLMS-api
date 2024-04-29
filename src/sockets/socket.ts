import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer): void {
    const origin = process.env.NODE_ENV === 'development'
        ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080', 'https://slms-client-2aam.vercel.app']
        : ['https://SLMS.com', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'https://slms-client-2aam.vercel.app', 'https://akaalshaouni.org'];

    io = new SocketIOServer(server, {
        cors: {
            origin,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected');
        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    console.log('Socket.io has been initialized.');
}

export function getIo(): SocketIOServer {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
}
