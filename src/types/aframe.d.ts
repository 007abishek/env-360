import type { CSSProperties, HTMLAttributes } from "react";

type AFrameElementProps = HTMLAttributes<HTMLElement> & {
  style?: CSSProperties;
  [key: string]: unknown;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "a-scene": AFrameElementProps;
      "a-sky": AFrameElementProps;
      "a-entity": AFrameElementProps;
      "a-camera": AFrameElementProps;
      "a-cone": AFrameElementProps;
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "a-scene": AFrameElementProps;
      "a-sky": AFrameElementProps;
      "a-entity": AFrameElementProps;
      "a-camera": AFrameElementProps;
      "a-cone": AFrameElementProps;
    }
  }
}

export {};
