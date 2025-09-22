import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { config, getRedisOptions } from '../config/index.js';
import { logger, logError, logConversationInteraction } from '../utils/logger.js';
import type { MedicalResponse } from './medical-assistant.js';

export interface ConversationMessage {
  id: string;
  timestamp: string;
  type: 'query' | 'response';
  content: string;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  id: string;
  patientId?: string;
  startTime: string;
  lastActivity: string;
  messages: ConversationMessage[];
  summary?: string;
  tags: string[];
  status: 'active' | 'completed' | 'archived';
}

export interface ConversationSummary {
  totalMessages: number;
  duration: string;
  mainTopics: string[];
  concerns: string[];
  recommendations: string[];
  followUpNeeded: boolean;
}

/**
 * Conversation Manager
 * Manages medical conversations, context, and history
 */
export class ConversationManager {
  private redis?: RedisClientType;
  private conversations: Map<string, ConversationContext> = new Map();
  private isInitialized = false;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Initialize Redis client if available
    if (config.redisUrl || config.redisHost) {
      this.redis = createClient(getRedisOptions()) as RedisClientType;
    }
  }

  /**
   * Initialize the conversation manager
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Conversation Manager...');

      const startTime = Date.now();

      // Connect to Redis if available
      if (this.redis) {
        await this.redis.connect();
        logger.info('Connected to Redis for conversation storage');
      } else {
        logger.warn('Redis not configured, using in-memory conversation storage');
      }

      // Start cleanup routine
      this.startCleanupRoutine();

      this.isInitialized = true;

      const initTime = Date.now() - startTime;
      logger.info(`Conversation Manager initialized in ${initTime}ms`);
    } catch (error) {
      logError(error, 'ConversationManager.initialize');
      throw new Error('Failed to initialize Conversation Manager');
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(patientId?: string): Promise<string> {
    try {
      const conversationId = uuidv4();
      const now = new Date().toISOString();

      const conversation: ConversationContext = {
        id: conversationId,
        patientId,
        startTime: now,
        lastActivity: now,
        messages: [],
        tags: [],
        status: 'active',
      };

      // Store conversation
      await this.storeConversation(conversation);

      logger.info(`Created new conversation: ${conversationId}`);
      return conversationId;
    } catch (error) {
      logError(error, 'ConversationManager.createConversation');
      throw new Error('Failed to create conversation');
    }
  }

  /**
   * Get conversation context
   */
  async getContext(conversationId: string): Promise<ConversationContext | null> {
    try {
      // Try to get from cache first
      let conversation = this.conversations.get(conversationId);

      if (!conversation && this.redis) {
        // Try to get from Redis
        const data = await this.redis.get(`conversation:${conversationId}`);
        if (data) {
          conversation = JSON.parse(data);
          if (conversation) {
            this.conversations.set(conversationId, conversation);
          }
        }
      }

      return conversation || null;
    } catch (error) {
      logError(error, 'ConversationManager.getContext');
      return null;
    }
  }

  /**
   * Save interaction to conversation
   */
  async saveInteraction(
    conversationId: string,
    query: string,
    response: MedicalResponse
  ): Promise<void> {
    try {
      let conversation = await this.getContext(conversationId);

      if (!conversation) {
        // Create new conversation if it doesn't exist
        await this.createConversation();
        conversation = await this.getContext(conversationId);
        if (!conversation) {
          throw new Error('Failed to create conversation');
        }
      }

      const now = new Date().toISOString();

      // Add query message
      const queryMessage: ConversationMessage = {
        id: uuidv4(),
        timestamp: now,
        type: 'query',
        content: query,
        metadata: {
          entities: response.entitiesFound,
          confidence: response.confidenceScore,
        },
      };

      // Add response message
      const responseMessage: ConversationMessage = {
        id: uuidv4(),
        timestamp: now,
        type: 'response',
        content: JSON.stringify(response.recommendations),
        metadata: {
          sources: response.sources,
          followUpQuestions: response.followUpQuestions,
          urgency: response.recommendations.urgency,
        },
      };

      conversation.messages.push(queryMessage, responseMessage);
      conversation.lastActivity = now;

      // Update tags based on content
      await this.updateConversationTags(conversation, response);

      // Limit conversation memory
      if (conversation.messages.length > config.maxConversationMemory * 2) {
        conversation.messages = conversation.messages.slice(-config.maxConversationMemory * 2);
      }

      // Store updated conversation
      await this.storeConversation(conversation);

      logConversationInteraction(conversationId, 'query', query.length);
      logConversationInteraction(conversationId, 'response', JSON.stringify(response).length);
    } catch (error) {
      logError(error, 'ConversationManager.saveInteraction');
      throw new Error('Failed to save conversation interaction');
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    conversationId: string,
    limit?: number
  ): Promise<ConversationMessage[]> {
    try {
      const conversation = await this.getContext(conversationId);
      if (!conversation) {
        return [];
      }

      const messages = conversation.messages;
      return limit ? messages.slice(-limit) : messages;
    } catch (error) {
      logError(error, 'ConversationManager.getConversationHistory');
      return [];
    }
  }

  /**
   * Generate conversation summary
   */
  async generateConversationSummary(conversationId: string): Promise<ConversationSummary | null> {
    try {
      const conversation = await this.getContext(conversationId);
      if (!conversation) {
        return null;
      }

      const messages = conversation.messages;
      const queries = messages.filter((m) => m.type === 'query');
      const responses = messages.filter((m) => m.type === 'response');

      // Calculate duration
      const startTime = new Date(conversation.startTime);
      const endTime = new Date(conversation.lastActivity);
      const duration = this.formatDuration(endTime.getTime() - startTime.getTime());

      // Extract main topics from tags
      const mainTopics = [...new Set(conversation.tags)];

      // Extract concerns from query messages
      const concerns = queries.map((q) => q.content.substring(0, 100)).slice(0, 5);

      // Extract recommendations from response messages
      const recommendations: string[] = [];
      for (const response of responses) {
        try {
          const responseData = JSON.parse(response.content);
          if (responseData.primary) {
            recommendations.push(responseData.primary);
          }
        } catch {
          // Skip invalid JSON
        }
      }

      // Determine if follow-up is needed
      const followUpNeeded = responses.some((r) => {
        try {
          const responseData = JSON.parse(r.content);
          return (
            responseData.followUpRequired ||
            responseData.urgency === 'high' ||
            responseData.urgency === 'emergency'
          );
        } catch {
          return false;
        }
      });

      return {
        totalMessages: messages.length,
        duration,
        mainTopics: mainTopics.slice(0, 5),
        concerns,
        recommendations: recommendations.slice(0, 5),
        followUpNeeded,
      };
    } catch (error) {
      logError(error, 'ConversationManager.generateConversationSummary');
      return null;
    }
  }

  /**
   * Archive conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    try {
      const conversation = await this.getContext(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.status = 'archived';
      conversation.summary = JSON.stringify(await this.generateConversationSummary(conversationId));

      await this.storeConversation(conversation);

      // Remove from active cache
      this.conversations.delete(conversationId);

      logger.info(`Archived conversation: ${conversationId}`);
    } catch (error) {
      logError(error, 'ConversationManager.archiveConversation');
      throw new Error('Failed to archive conversation');
    }
  }

  /**
   * Get patient conversations
   */
  async getPatientConversations(patientId: string): Promise<ConversationContext[]> {
    try {
      const conversations: ConversationContext[] = [];

      if (this.redis) {
        // Search Redis for patient conversations
        const pattern = 'conversation:*';
        const keys = await this.redis.keys(pattern);

        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const conversation = JSON.parse(data);
            if (conversation.patientId === patientId) {
              conversations.push(conversation);
            }
          }
        }
      } else {
        // Search in-memory conversations
        for (const conversation of this.conversations.values()) {
          if (conversation.patientId === patientId) {
            conversations.push(conversation);
          }
        }
      }

      // Sort by last activity (most recent first)
      conversations.sort(
        (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );

      return conversations;
    } catch (error) {
      logError(error, 'ConversationManager.getPatientConversations');
      return [];
    }
  }

  /**
   * Store conversation
   */
  private async storeConversation(conversation: ConversationContext): Promise<void> {
    // Store in memory cache
    this.conversations.set(conversation.id, conversation);

    // Store in Redis if available
    if (this.redis) {
      await this.redis.setEx(
        `conversation:${conversation.id}`,
        config.conversationTimeoutMinutes * 60, // TTL in seconds
        JSON.stringify(conversation)
      );
    }
  }

  /**
   * Update conversation tags based on response
   */
  private async updateConversationTags(
    conversation: ConversationContext,
    response: MedicalResponse
  ): Promise<void> {
    const newTags: string[] = [];

    // Add entity types as tags
    for (const [entityType, entities] of Object.entries(response.entitiesFound)) {
      if (entities.length > 0) {
        newTags.push(entityType);
        // Add specific entities as tags (limit to avoid too many tags)
        newTags.push(...entities.slice(0, 2));
      }
    }

    // Add recommendation type as tag
    newTags.push(response.recommendations.type);

    // Add urgency level as tag
    newTags.push(`urgency:${response.recommendations.urgency}`);

    // Merge with existing tags (remove duplicates)
    conversation.tags = [...new Set([...conversation.tags, ...newTags])];

    // Limit number of tags
    if (conversation.tags.length > 20) {
      conversation.tags = conversation.tags.slice(-20);
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Start cleanup routine for expired conversations
   */
  private startCleanupRoutine(): void {
    const cleanupInterval = 30 * 60 * 1000; // 30 minutes

    this.cleanupInterval = setInterval(async () => {
      try {
        const now = Date.now();
        const timeoutMs = config.conversationTimeoutMinutes * 60 * 1000;

        // Clean up in-memory conversations
        for (const [id, conversation] of this.conversations.entries()) {
          const lastActivity = new Date(conversation.lastActivity).getTime();
          if (now - lastActivity > timeoutMs) {
            // Archive expired conversation
            await this.archiveConversation(id);
          }
        }

        logger.debug('Conversation cleanup completed');
      } catch (error) {
        logError(error, 'ConversationManager.cleanupRoutine');
      }
    }, cleanupInterval);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up Conversation Manager...');

      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Disconnect from Redis
      if (this.redis) {
        await this.redis.disconnect();
      }

      // Clear in-memory conversations
      this.conversations.clear();

      this.isInitialized = false;
      logger.info('Conversation Manager cleaned up');
    } catch (error) {
      logError(error, 'ConversationManager.cleanup');
    }
  }
}
