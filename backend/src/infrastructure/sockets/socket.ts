import { Server as SocketServer, Socket } from 'socket.io';
import http from 'http';
import { OrganizationMember } from '../../modules/organizations/member.model';
import { logger } from '../../config/logger';

let io: SocketServer;

export function initializeSockets(server: http.Server, origin: string): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 Client socket connected: ${socket.id}`);

    // Join tenant-isolated room
    socket.on('join-organization', async ({ userId, organizationId }) => {
      try {
        if (!userId || !organizationId) {
          socket.emit('error', { message: 'Missing join parameters' });
          return;
        }

        // Multi-tenant check: assert user membership in organization
        const isMember = await OrganizationMember.exists({
          userId,
          organizationId,
          status: 'ACTIVE',
        });

        if (isMember) {
          const roomName = `org:${organizationId}`;
          socket.join(roomName);
          logger.info(`👤 Socket ${socket.id} joined private room [${roomName}]`);
          socket.emit('joined', { room: roomName });
        } else {
          logger.warn(`🛑 Unauthorized room join attempt by socket ${socket.id} for org: ${organizationId}`);
          socket.emit('error', { message: 'Unauthorized room join access' });
        }
      } catch (err) {
        logger.error('Socket room join exception:', err);
        socket.emit('error', { message: 'Server error joining room' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Client socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Emit an event safely to a specific organization room
 * @param organizationId Target tenant
 * @param event Event identifier string
 * @param payload Event payload object
 */
export function emitToOrganization(organizationId: string, event: string, payload: any): void {
  if (!io) {
    logger.warn('Socket.io server not initialized; skipping broadcast.');
    return;
  }
  const roomName = `org:${organizationId}`;
  io.to(roomName).emit(event, payload);
  logger.info(`📡 Broadcasted event [${event}] to room [${roomName}]`);
}
