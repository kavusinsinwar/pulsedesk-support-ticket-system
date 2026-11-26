import { EventEmitter } from 'events';
import { EventType } from '@prisma/client';
import { DomainEventMap } from './event.types';

type EventHandler<K extends EventType> = (payload: DomainEventMap[K]) => Promise<void> | void;

/**
 * Strongly-typed in-process Domain Event Bus built on Node's EventEmitter.
 * Decouples core transactional operations from side effects (activity logs, notifications).
 * Easily replaceable with Redis Pub/Sub, BullMQ, or Kafka in distributed deployments.
 */
class DomainEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(25);
  }

  public on<K extends EventType>(event: K, handler: EventHandler<K>): void {
    this.emitter.on(event, (payload: DomainEventMap[K]) => {
      Promise.resolve(handler(payload)).catch((error) => {
        console.error(`[EventBus] Unhandled error in listener for ${event}:`, error);
      });
    });
  }

  public emit<K extends EventType>(event: K, payload: DomainEventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  public clearAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const eventBus = new DomainEventBus();
