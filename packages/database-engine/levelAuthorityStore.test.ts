import { FakeAuthorityBacking, runAuthorityStoreConformanceSuite } from "./authorityStoreConformance";

let moduleVersion = 0;

async function loadModule() {
  return import(`./levelAuthorityStore.ts`);
}

runAuthorityStoreConformanceSuite(
  "createLevelAuthorityStore",
  async () => {
    const { createLevelAuthorityStore } = await loadModule();
    const backing = new FakeAuthorityBacking();
    return {
      backing,
      store: createLevelAuthorityStore(backing),
    };
  }
);
