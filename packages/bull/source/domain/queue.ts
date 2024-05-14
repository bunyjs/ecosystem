import {Queue, QueueOptions, QueueListener} from "bullmq";

import container, {createDecorator, DecoratorType, Token, createMetadata, useClass} from "@buny/ioc";

import Redis from "@buny/redis";

const queueStore = new Set<Token<Queue>>();

interface QueueEventMetadata {
  event: keyof QueueListener<any, any, any>;
  handler: string;
  once: boolean;
}

const queueEventsMetadata = createMetadata<QueueEventMetadata[]>("workerEvents");

const queueEvent = createDecorator("queueEvent", (event: keyof QueueListener<any, any, any>, once = false) => ({
  apply: [
    DecoratorType.Method,
  ],
  instance: [
    Queue,
  ],
  onInit: (context) => {
    const queueEvents = queueEventsMetadata.get(context.class) || [];

    queueEvents.push({
      event,
      handler: context.propertyKey,
      once,
    });

    queueEventsMetadata.set(queueEvents, context.class);
  },
}));

interface BullQueueOptions extends Partial<QueueOptions> {
}

const queue = createDecorator("queue", (name: string, options?: BullQueueOptions) => ({
  apply: [
    DecoratorType.Class,
  ],
  instance: [
    Queue,
  ],
  onBoostrap: async (context) => {
    const token = Token.from(context.target);

    const queueEvents = queueEventsMetadata.get(context.target) || [];

    await container.register(token, useClass({
      dependencies: [
        Token.from(Redis),
      ],
      constructor: context.target,
      create: () => {
        const redis = container.resolve(Redis);

        const queue = new (context.target as typeof Queue)(name, {
          connection: {
            lazyConnect: true,
            client: redis,
          },
          ...options as QueueOptions,
        });

        for (const queueEvent of queueEvents) {
          queue[queueEvent.once ? "once" : "on"](queueEvent.event, queue[queueEvent.handler].bind(queue));
        }

        return queue;
      },
    }));

    queueStore.add(token);
  },
}));

export {
  queueEvent,
  queue,
};

export default queueStore;
