import App, {start} from "@buny/core";
import {usable, use} from "@buny/di";

import Redis from "@buny/redis";

@usable()
class MyApp extends App {
  @use()
    redis: Redis;

  @start()
  async start() {
    await this.redis.set("key", "value");
    const value = await this.redis.get("key");
    console.log(value); // value
    await this.redis.del("key");
    console.log(await this.redis.get("key")); // null
    await this.quit();
  }
}

await MyApp.bootstrap();
