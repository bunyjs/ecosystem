import IORedis, {RedisOptions} from "ioredis";

import {shutdown, start} from "@buny/core";
import {use, usable} from "@buny/di";

import Config from "@buny/config";
import Logger from "@buny/logger";

interface RedisConfig extends RedisOptions {
}

declare module "@buny/config" {
  interface ExtendableConfig {
    redis?: RedisConfig;
  }
}

@usable()
class Redis extends IORedis {
  @use()
    logger: Logger;

  constructor(@use() config: Config) {
    super({
      lazyConnect: true,
      ...config.redis,
    });

    this.on("connect", () => {
      this.logger.info(this.logger.mark("Redis"), "Connected");
    });

    this.on("reconnecting", () => {
      this.logger.info(this.logger.mark("Redis"), "Reconnecting");
    });

    this.on("close", () => {
      this.logger.info(this.logger.mark("Redis"), "Closed");
    });
  }

  @start()
  async connect() {
    if (this.options.lazyConnect) {
      await super.connect();
    }
  }

  @shutdown()
  async disconnect() {
    super.disconnect();
  }
}

export default Redis;
