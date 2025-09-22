/**
 * Notification Service - Handles email and WebSocket notifications
 */

import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface EmailNotification {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: Date;
}

export class NotificationService {
  private webSocketConnections: Set<any> = new Set();

  constructor() {
    logger.info('Initializing Notification Service');
  }

  async sendEmail(notification: EmailNotification): Promise<boolean> {
    if (!config.email.enabled) {
      logger.debug('Email notifications are disabled');
      return false;
    }

    try {
      // In a real implementation, you would use nodemailer or similar
      logger.info('Email notification sent', {
        to: notification.to,
        subject: notification.subject,
      });

      // Simulate email sending
      await new Promise((resolve) => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      logger.error('Failed to send email notification', { error, notification });
      return false;
    }
  }

  async sendWebSocketMessage(type: string, data: any): Promise<void> {
    if (!config.websocket.enabled) {
      logger.debug('WebSocket notifications are disabled');
      return;
    }

    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date(),
    };

    const messageString = JSON.stringify(message);
    let sentCount = 0;

    for (const connection of this.webSocketConnections) {
      try {
        if (connection.readyState === 1) {
          // WebSocket.OPEN
          connection.send(messageString);
          sentCount++;
        } else {
          // Remove dead connections
          this.webSocketConnections.delete(connection);
        }
      } catch (error) {
        logger.warn('Failed to send WebSocket message to connection', { error });
        this.webSocketConnections.delete(connection);
      }
    }

    logger.debug(`WebSocket message sent to ${sentCount} connections`, {
      type,
      totalConnections: this.webSocketConnections.size,
    });
  }

  addWebSocketConnection(connection: any): void {
    this.webSocketConnections.add(connection);
    logger.info('WebSocket connection added', {
      totalConnections: this.webSocketConnections.size,
    });

    // Send welcome message
    this.sendWebSocketMessage('connection', {
      status: 'connected',
      message: 'Welcome to Nexus Saúde monitoring dashboard',
    });

    // Handle connection close
    connection.on('close', () => {
      this.webSocketConnections.delete(connection);
      logger.info('WebSocket connection removed', {
        totalConnections: this.webSocketConnections.size,
      });
    });

    connection.on('error', (error: Error) => {
      logger.warn('WebSocket connection error', { error });
      this.webSocketConnections.delete(connection);
    });
  }

  getConnectionCount(): number {
    return this.webSocketConnections.size;
  }

  async broadcastSystemUpdate(update: any): Promise<void> {
    await this.sendWebSocketMessage('system_update', update);
  }

  async broadcastAlert(alert: any): Promise<void> {
    await this.sendWebSocketMessage('alert', alert);
  }

  async broadcastMetrics(metrics: any): Promise<void> {
    await this.sendWebSocketMessage('metrics', metrics);
  }

  async sendNotification(
    type: 'email' | 'websocket',
    notification: EmailNotification | WebSocketMessage
  ): Promise<boolean> {
    try {
      switch (type) {
        case 'email':
          return await this.sendEmail(notification as EmailNotification);

        case 'websocket':
          const wsMsg = notification as WebSocketMessage;
          await this.sendWebSocketMessage(wsMsg.type, wsMsg.data);
          return true;

        default:
          logger.warn(`Unknown notification type: ${type}`);
          return false;
      }
    } catch (error) {
      logger.error('Failed to send notification', { error, type, notification });
      return false;
    }
  }

  getNotificationStats(): {
    emailEnabled: boolean;
    websocketEnabled: boolean;
    activeConnections: number;
  } {
    return {
      emailEnabled: config.email.enabled,
      websocketEnabled: config.websocket.enabled,
      activeConnections: this.webSocketConnections.size,
    };
  }
}

export default NotificationService;
