import {usable} from "@buny/di";

import {DecoratorType, Token, createDecorator, createMetadata} from "@buny/ioc";

interface ReduxSlice<State = Record<string, any>> {
  defaultState: State;
}

class ReduxSlice<State = Record<string, any>> {
  protected state: State;
}

interface SliceStore {
  token: Token<ReduxSlice>;
  constructor: new () => ReduxSlice;
}

interface SliceMetadata {
  name: string;
  reducers?: string[];
  selectors?: string[];
  extraReducers?: string[];
}

const slicesStore = new Set<SliceStore>();

const sliceMetadata = createMetadata<SliceMetadata>(
  Token.create("slices"),
);

const slice = createDecorator("slice", (name: string) => ({
  apply: [
    DecoratorType.Class,
  ],
  use: [
    usable(),
  ],
  instance: [
    ReduxSlice,
  ],
  onInit: (context) => {
    const token = Token.from(context.target);

    const metadata = sliceMetadata.from(context.target);

    const data = metadata.get();

    metadata.set({
      ...data,
      name,
    });

    slicesStore.add({
      token,
      constructor: context.target,
    });
  },
}));

const reducer = createDecorator("reducer", () => ({
  apply: [
    DecoratorType.Method,
  ],
  instance: [
    ReduxSlice,
  ],
  onInit: (context) => {
    const metadata = sliceMetadata.from(context.class);

    const data = metadata.get();

    metadata.set({
      ...data,
      reducers: [
        ...(data?.reducers ?? []),
        context.propertyKey,
      ],
    });
  },
}));

const selector = createDecorator("selector", () => ({
  apply: [
    DecoratorType.Method,
  ],
  instance: [
    ReduxSlice,
  ],
  onInit: (context) => {
    const metadata = sliceMetadata.from(context.class);

    const data = metadata.get();

    metadata.set({
      ...data,
      selectors: [
        ...(data?.selectors ?? []),
        context.propertyKey,
      ],
    });
  },
}));

const builder = createDecorator("builder", () => ({
  apply: [
    DecoratorType.Method,
  ],
  instance: [
    ReduxSlice,
  ],
  onInit: (context) => {
    const metadata = sliceMetadata.from(context.class);

    const data = metadata.get();

    metadata.set({
      ...data,
      extraReducers: [
        ...(data?.extraReducers ?? []),
        context.propertyKey,
      ],
    });
  },
}));

export {
  ReduxSlice,
};

export {
  slicesStore,
  sliceMetadata,
};

export {
  slice,
  reducer,
  selector,
  builder,
};
