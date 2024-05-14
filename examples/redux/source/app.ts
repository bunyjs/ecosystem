import App, {start} from "@buny/core";
import {usable, use} from "@buny/di";

import Redux, {ReduxSlice, slice, reducer, selector} from "@buny/redux";

interface CounterState {
  count: number;
}

@slice("counter")
class CounterSlice extends ReduxSlice<CounterState> {
  @reducer()
  increment(action = 1) {
    this.state.count += action;
  }

  @reducer()
  decrement(action = -1) {
    this.state.count += action;
  }

  @selector()
  count() {
    return this.state.count;
  }
}

@usable()
class MyApp extends App {
  @use()
    counterSlice: CounterSlice;

  @use()
    redux: Redux;

  @start()
  start() {
    console.log(this.counterSlice.count());
    this.counterSlice.increment();
    console.log(this.counterSlice.count());
    this.counterSlice.decrement();
    console.log(this.counterSlice.count());
  }
}

await MyApp.bootstrap();
