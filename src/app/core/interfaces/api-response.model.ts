/**
 * Mirrors Planura.Shared.Errors.Response.ApiResponse / ApiValidationErrorResponse.
 * Every error thrown by the backend's ExeptionHandlerMiddleware, and every
 * automatic [ApiController] model-validation failure, is shaped like this.
 *
 * IMPORTANT: the backend has a genuine typo on the validation-errors field —
 * it serializes as "erroes", not "errors". Reproduced here verbatim on purpose
 * so parsing actually matches what the API sends.
 */
export interface ApiErrorResponse {
  statusCode: number;
  message?: string;
  /** Only present on DataAnnotations model-validation failures (HTTP 400). */
  erroes?: string[];
}

/**
 * Normalized error shape produced by the error interceptor for the UI layer,
 * so components never need to know about the "erroes" typo or status-code
 * branching themselves.
 */
export interface AppError {
  status: number;
  message: string;
  fieldErrors: string[];
}
