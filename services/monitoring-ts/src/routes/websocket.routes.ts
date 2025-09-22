/**
 * WebSocket Routes - Real-time monitoring connections
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger.js';
import type WebSocket from 'ws';

// Minimal NotificationService surface used in this file
type NotificationService = {
  addWebSocketConnection: (socket: WebSocket) => void;
  getNotificationStats: () => Record<string, unknown>;
};

export async function websocketRoutes(fastify: FastifyInstance): Promise<void> {
  // WebSocket endpoint for real-time monitoring
  // Fastify WS plugin expects the `websocket: true` option; provide the option
  // but avoid casting the whole options object to `any`.
  // The Fastify WS plugin changes the expected handler signature. Cast the
  // handler to `any` at the registration site to satisfy the Fastify types
  // while keeping the inner handler typed for clarity.
  fastify.get(
    '/',
    { websocket: true } as any,
    ((connection: WebSocket, request: FastifyRequest) => {
      logger.info('WebSocket connection established');
      const notificationService = globalThis.notificationService as unknown as NotificationService;
      notificationService.addWebSocketConnection(connection);

      // Handle incoming messages
      connection.on('message', (message: WebSocket.Data) => {
        try {
          const payload = typeof message === 'string' ? message : message.toString();
          const data = JSON.parse(payload);
          logger.debug('WebSocket message received', { data });

          // Handle different message types
          switch (data.type) {
            case 'ping':
              connection.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
              break;

            case 'subscribe':
              // Handle subscription to specific data streams
              logger.info('Client subscribed to data stream', { stream: data.stream });
              break;

            case 'unsubscribe':
              // Handle unsubscription
              logger.info('Client unsubscribed from data stream', { stream: data.stream });
              break;

            default:
              logger.warn('Unknown WebSocket message type', { type: data.type });
          }
        } catch (error) {
          logger.error('Error processing WebSocket message', { error, message: String(message) });
        }
      });

      connection.on('close', () => {
        logger.info('WebSocket connection closed');
      });

      connection.on('error', (error: Error) => {
        logger.error('WebSocket connection error', { error });
      });
    }) as any
  );

  // WebSocket status endpoint
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const notificationService = globalThis.notificationService as unknown as NotificationService;
      const stats = notificationService.getNotificationStats();
      return { success: true, data: stats };
    } catch (error) {
      logger.error('Failed to get WebSocket status', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get WebSocket status' });
    }
  });
}

export default websocketRoutes;
