/**
 * External Reader Provider - Shared Contract
 *
 * Re-exports the generic provider descriptor types for external platform readers.
 */

export type {
  ExternalReaderStatus,
  ExternalReaderMode,
  ExternalReaderAction,
  ExternalReaderDiagnostic,
  ExternalReaderSample,
  ExternalReaderStateResponse,
  ExternalReaderProviderDescriptor,
} from "./types";

export {
  VALID_EXTERNAL_READER_ACTIONS,
  isValidExternalReaderAction,
} from "./types";
