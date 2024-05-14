import {Store, configureStore, combineReducers, createSlice, Slice, ConfigureStoreOptions} from "@reduxjs/toolkit";

import {init} from "@buny/core";
import {usable, use} from "@buny/di";
import container from "@buny/ioc";
import Config from "@buny/config";

import {slicesStore, sliceMetadata} from "~/domain/slice";

interface ReduxConfig extends Omit<ConfigureStoreOptions, "reducer"> {
}

declare module "@buny/config" {
  interface ExtendableConfig {
    redux?: ReduxConfig;
  }
}

@usable()
class Redux {
  store: Store;

  constructor(@use() config: Config) {
    this.store = configureStore({
      ...config.redux,
      reducer: (state) => state,
      devTools: false,
    });
  }

  @init()
  async init() {
    const slices: Slice[] = [];

    for (const {token, constructor} of slicesStore) {
      const metadata = sliceMetadata.get(constructor);

      const module = await container.resolve(token);

      const slice = createSlice({
        name: metadata.name,
        reducerPath: metadata.name,
        initialState: module.defaultState,
        reducers: (metadata.reducers ?? []).reduce((reducers, reducerName) => {
          const reducer = module[reducerName];

          reducers[reducerName] = (state: any, action: any) => {
            return Reflect.apply(reducer, {
              ...module,
              state,
            }, [
              action.payload,
              action.type,
            ]);
          };

          return reducers;
        }, {}),
        selectors: (metadata.selectors ?? []).reduce((selectors, selectorName) => {
          const selector = module[selectorName];

          selectors[selectorName] = (state: any) => {
            return Reflect.apply(selector, {
              ...module,
              state,
            }, []);
          };

          return selectors;
        }, {}),
        extraReducers: (builder) => {
          const module = container.resolve(token);

          for (const extraReducerName of (metadata.extraReducers ?? [])) {
            module[extraReducerName](builder);
          }
        },
      });

      (metadata.reducers ?? []).forEach((reducerName) => {
        module[reducerName] = (action: any) => {
          this.store.dispatch(slice.actions[reducerName](action));
        };
      });

      (metadata.selectors ?? []).forEach((selectorName) => {
        module[selectorName] = () => {
          const storeState = this.store.getState();
          return slice.selectors[selectorName](storeState);
        };
      });

      slices.push(slice);
    }

    const reducer = combineReducers(Object.fromEntries(slices.map((slice) => [
      slice.reducerPath,
      slice.reducer,
    ])));

    this.store.replaceReducer(reducer);

    slicesStore.clear();
  }
}

export * from "./domain/slice";

export default Redux;
