/**
 * Shared builder for agent seed records used by platform presets and
 * createSpaceAgents shared-space seeds. Resolves structural defaults plus
 * model price/vision metadata so call sites only pass what's unique.
 */

export {
  type AgentSeedDefaults,
  type AgentSeedConfig,
  type AgentSeed,
  type AgentSeedInput,
  type PublicAgentSeedConfig,
  AGENT_SEED_DEFAULTS,
  resolveModelPrice,
  defineAgentSeed,
} from "../../packages/core/publicAgentSeeds";
