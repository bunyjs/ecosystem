import {FlowProducer, FlowProducerListener, QueueBaseOptions} from "bullmq";

import container, {createDecorator, DecoratorType, Token, createMetadata, useClass, ClassScope} from "@buny/ioc";

import Redis from "@buny/redis";

const flowProducerStore = new Set<Token<FlowProducer>>();

interface FlowProducerEventMetadata {
  event: keyof FlowProducerListener;
  handler: string;
  once: boolean;
}

const flowProducerEventMetadata = createMetadata<FlowProducerEventMetadata[]>("workerEvents");

const flowProducerEvent = createDecorator("flowProducerEvent", (event: keyof FlowProducerListener, once = false) => ({
  apply: [
    DecoratorType.Method,
  ],
  instance: [
    FlowProducer,
  ],
  onInit: (context) => {
    const flowProducerEvents = flowProducerEventMetadata.get(context.class) || [];

    flowProducerEvents.push({
      event,
      handler: context.propertyKey,
      once,
    });

    flowProducerEventMetadata.set(flowProducerEvents, context.class);
  },
}));

interface BullFlowOptions extends Partial<QueueBaseOptions> {
}

const flowProducer = createDecorator("flowProducer", (options?: BullFlowOptions) => ({
  apply: [
    DecoratorType.Class,
  ],
  instance: [
    FlowProducer,
  ],
  onBoostrap: async (context) => {
    const token = Token.from(context.target);

    const flowProducerEvents = flowProducerEventMetadata.get(context.target) || [];

    await container.register(token, useClass({
      scope: ClassScope.Singleton,
      dependencies: [
        Token.from(Redis),
      ],
      constructor: context.target,
      create: () => {
        const redis = container.resolve(Redis);

        const flow = new (context.target as typeof FlowProducer)({
          connection: {
            lazyConnect: true,
            client: redis,
          },
          ...options as QueueBaseOptions,
        });

        for (const flowProducerEvent of flowProducerEvents) {
          flow[flowProducerEvent.once ? "once" : "on"](flowProducerEvent.event, flow[flowProducerEvent.handler].bind(flow));
        }

        return flow;
      },
    }));

    flowProducerStore.add(token);
  },
}));

export {
  flowProducerEvent,
  flowProducer,
};

export default flowProducerStore;
