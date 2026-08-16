const globalWithDom = globalThis as typeof globalThis & {
  document?: Document;
  Element?: typeof Element;
  HTMLElement?: typeof HTMLElement;
};

if (
  typeof globalWithDom.document !== "undefined" &&
  typeof globalWithDom.Element === "undefined"
) {
  class PrismElementShim {}
  (
    PrismElementShim as unknown as { prototype: { matches?: () => boolean } }
  ).prototype.matches = () => false;
  globalWithDom.Element = PrismElementShim as unknown as typeof Element;
}

if (
  typeof globalWithDom.document !== "undefined" &&
  typeof globalWithDom.HTMLElement === "undefined" &&
  typeof globalWithDom.Element !== "undefined"
) {
  globalWithDom.HTMLElement = globalWithDom.Element as unknown as typeof HTMLElement;
}

export {};
