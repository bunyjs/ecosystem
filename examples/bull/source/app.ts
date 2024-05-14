import {Job, Queue, FlowProducer, Worker} from "bullmq";

import {queue, queueEvent, flowProducer, flowProducerEvent, worker, workerEvent, processor} from "@buny/bull";

import App, {start} from "@buny/core";
import {usable, use} from "@buny/di";

import "@buny/redis";

@queue("test")
class MyQueue extends Queue {
  @queueEvent("error")
  onWaiting() {
    console.log("Job is waiting");
  }
}

@flowProducer()
class MyFlow extends FlowProducer {
  @flowProducerEvent("error")
  onError() {
    console.log("Flow has errored");
  }
}

@worker("test")
class MyWorker extends Worker {
  @processor()
  async processor(job: Job) {
    await job.updateProgress(50);
    return "Hello World!";
  }

  @workerEvent("progress")
  onProgress() {
    console.log("Worker is progressing");
  }

  @workerEvent("completed")
  onCompleted() {
    console.log("Worker has completed");
  }
}

@usable()
class MyApp extends App {
  @use()
    queue: MyQueue;

  @use()
    flow: MyFlow;

  @use()
    worker: MyWorker;

  @start()
  async start() {
    await this.queue.add("test", {
      hello: "world",
    });

    await this.flow.add({
      name: "test",
      queueName: "test",
      children: [
        {
          name: "test",
          queueName: "test",
        },
        {
          name: "test",
          queueName: "test",
        },
      ],
    });
  }
}

await MyApp.bootstrap({
  redis: {
    maxRetriesPerRequest: null,
  },
});
