import type { ErrorCode } from "@kavach/contracts";
export class ServiceError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}
export const missing = () =>
  new ServiceError(404, "NOT_FOUND", "The resource was not found.");
