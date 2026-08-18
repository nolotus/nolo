import { runAuthorityStoreConformanceSuite } from "./authorityStoreConformance";

let moduleVersion = 0;

async function loadModule() {
  return import(`./memoryAuthorityStore.ts`);
}

runAuthorityStoreConformanceSuite(
  "createMemoryAuthorityStore",
  async () => {
    const { createMemoryAuthorityStore } = await loadModule();
    const store = createMemoryAuthorityStore("/tmp/authority-conformance");
    return {
      backing: null as never,
      store,
    };
  }
);
