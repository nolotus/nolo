// packages/core/errorMessage.ts
function toErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (error !== null && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}

export {
  toErrorMessage
};
