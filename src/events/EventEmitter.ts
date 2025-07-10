import mitt, { Emitter } from 'mitt';
import { EventMap } from './types';

export class EventEmitter {
  private mitt: Emitter<EventMap>;

  constructor() {
    this.mitt = mitt<EventMap>();
  }

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
    this.mitt.on(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
    this.mitt.off(event, handler);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.mitt.emit(event, data);
  }

  all(): Map<keyof EventMap, Array<(data: any) => void>> {
    return this.mitt.all as any;
  }

  clear(): void {
    this.mitt.all.clear();
  }
}
