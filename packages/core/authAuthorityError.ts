export const AUTHORITY_REQUEST_ERROR_BRAND = Symbol(
  "nolo.auth.authorityRequestError"
);

export interface AuthorityRequestErrorLike extends Error {
  readonly [AUTHORITY_REQUEST_ERROR_BRAND]: true;
  readonly status: 503;
  response(): Response;
}

export function isAuthorityRequestError(
  error: unknown
): error is AuthorityRequestErrorLike {
  return (
    error instanceof Error &&
    (error as Partial<AuthorityRequestErrorLike>)[
      AUTHORITY_REQUEST_ERROR_BRAND
    ] === true &&
    typeof (error as Partial<AuthorityRequestErrorLike>).response === "function"
  );
}

export function authorityRequestErrorResponse(error: unknown): Response | null {
  return isAuthorityRequestError(error) ? error.response() : null;
}
