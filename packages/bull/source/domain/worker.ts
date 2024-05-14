import {Worker, WorkerOptions, WorkerListener} from "bullmq";

import container, {createDecorator, DecoratorType, Token, createMetadata, useClass, invoke} from "@buny/ioc";

import Redis from "@buny/redis";

//

const workerStore = new Set<Token<Worker>>();

interface WorkerEventMetadata {
  event: keyof WorkerListener;
  handler: string;
  once: boolean;
}

const workerEventsMetadata = createMetadata<WorkerEventMetadata[]>("workerEvents");

const workerEvent = createDecorator("workerEvent", (event: keyof WorkerListener<any, any, any>, once = false) => ({
  apply: [
    DecoratorType.Method,
  ],
  instance: [
    Worker,
  ],
  onInit: (context) => {
    const workerEvents = workerEventsMetadata.get(context.class) || [];

    workerEvents.push({
      event,
      handler: context.propertyKey,
      once,
    });

    workerEventsMetadata.set(workerEvents, context.class);
  },
}));

interface BullWorkerOptions extends Partial<WorkerOptions> {
}

const worker = createDecorator("worker", (name: string, options?: BullWorkerOptions) => ({
  apply: [
    DecoratorType.Class,
  ],
  instance: [
    Worker,
  ],
  onBoostrap: async (context) => {
    const token = Token.from(context.target);

    const workerEvents = workerEventsMetadata.get(context.target) || [];
    const processorEvents = processorEventMetadata.get(context.target) || [];

    await container.register(token, useClass({
      dependencies: [
        Token.from(Redis),
      ],
      constructor: context.target,
      create: () => {
        const redis = container.resolve(Redis);

        const worker = new (context.target as typeof Worker)(name, async (job) => {
          const instance = await container.resolve(token);

          for (const processorEvent of processorEvents) {
            processorEvent.name ??= job.name;

            if (processorEvent.name === job.name) {
              await invoke({
                instance,
                method: processorEvent.handler,
                args: [job],
                container,
              });
            }
          }
        }, {
          connection: {
            lazyConnect: true,
            client: redis,
          },
          ...options as WorkerOptions,
        });

        for (const workerEvent of workerEvents) {
          worker[workerEvent.once ? "once" : "on"](workerEvent.event, worker[workerEvent.handler].bind(worker));
        }

        return worker;
      },
    }));

    workerStore.add(token);
  },
}));

//

interface ProcessorEventMetadata {
  handler: string | symbol;
  name?: string;
}

const processorEventMetadata = createMetadata<ProcessorEventMetadata[]>("processEvents");

const processor = createDecorator("processor", (name?: string) => ({
  apply: [
    DecoratorType.Method,
  ],
  instance: [
    Worker,
  ],
  onInit: (context) => {
    const processorEvents = processorEventMetadata.get(context.class) || [];

    processorEvents.push({
      handler: context.propertyKey,
      name,
    });

    processorEventMetadata.set(processorEvents, context.class);
  },
}));

export {
  workerEvent,
};

export {
  processor,
  worker,
};

export default workerStore;
