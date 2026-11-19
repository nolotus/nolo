export const GITHUB_COMPLETION_PATH = "/auth/github/complete";
export const GITHUB_SESSION_KIND = "github-session-v1";
export const GITHUB_AUTH_INVALID = "GITHUB_AUTH_INVALID";
export const GITHUB_AUTH_UNAVAILABLE = "GITHUB_AUTH_UNAVAILABLE";

export interface GitHubLoginRequest { tabBinding: string }
export interface GitHubCompleteRequest extends GitHubLoginRequest { state: string }
export interface GitHubStartResponse { authorizationUrl: string }
export interface GitHubCompleteResponse { status: "authenticated"; token: string }

export const isExternalSessionKind = (kind: unknown) => kind === "google-session-v1" || kind === GITHUB_SESSION_KIND;
