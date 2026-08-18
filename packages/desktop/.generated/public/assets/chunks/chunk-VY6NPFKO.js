import {
  AbstractMermaidTokenBuilder,
  CommonValueConverter,
  EmptyFileSystem,
  MermaidGeneratedSharedModule,
  RadarGeneratedModule,
  __name,
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  inject,
  lib_exports
} from "/public/assets/chunks/chunk-TBAVFAKQ.js";

// node_modules/@mermaid-js/parser/dist/chunks/mermaid-parser.core/chunk-2O5ZK7RR.mjs
var _a;
var RadarTokenBuilder = (_a = class extends AbstractMermaidTokenBuilder {
  constructor() {
    super(["radar-beta"]);
  }
}, __name(_a, "RadarTokenBuilder"), _a);
var RadarModule = {
  parser: {
    TokenBuilder: /* @__PURE__ */ __name(() => new RadarTokenBuilder(), "TokenBuilder"),
    ValueConverter: /* @__PURE__ */ __name(() => new CommonValueConverter(), "ValueConverter")
  }
};
function createRadarServices(context = EmptyFileSystem) {
  const shared = inject(
    createDefaultSharedCoreModule(context),
    MermaidGeneratedSharedModule
  );
  const Radar = inject(
    createDefaultCoreModule({ shared }),
    RadarGeneratedModule,
    RadarModule
  );
  shared.ServiceRegistry.register(Radar);
  return { shared, Radar };
}
__name(createRadarServices, "createRadarServices");

export {
  RadarModule,
  createRadarServices
};
