import {init} from "@buny/core";
import {usable} from "@buny/di";

import container from "@buny/ioc";

import flowProducerStore from "~/domain/flow";
import queueStore from "~/domain/queue";
import workerStore from "~/domain/worker";

interface BullConfig {
}

declare module "@buny/config" {
  interface ExtendableConfig {
    bull?: BullConfig;
  }
}

@usable()
class BullModule {
  @init()
  async init() {
    await Promise.all(Array.from(flowProducerStore.values()).map((token) => {
      return container.resolve(token);
    }));

    await Promise.all(Array.from(queueStore.values()).map((token) => {
      return container.resolve(token);
    }));

    await Promise.all(Array.from(workerStore.values()).map((token) => {
      return container.resolve(token);
    }));
  }
}

export * from "./domain/flow";
export * from "./domain/queue";
export * from "./domain/worker";

export default BullModule;
