import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AppError, ApiErrorResponse } from '../interfaces/api-response.model';

/**
 * Normalizes every failed HTTP call into an AppError so components never
 * need to know about the backend's ApiResponse/ApiValidationErrorResponse
 * shapes (including the "erroes" typo) directly.
 *
 * Covers, per Planura.Apis.MiddleWares.ExeptionHandlerMiddleware:
 *  - 400 BadRequestExeption / model-validation (with "erroes" array)
 *  - 401 UnAuthorizedExeption (custom) and framework JWT-challenge 401s
 *  - 404 NotFoundExeption
 *  - 500 unhandled (dev builds include a "details" field we don't surface)
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const body = error.error as ApiErrorResponse | null;

      const appError: AppError = {
        status: error.status,
        message: body?.message ?? defaultMessageFor(error.status),
        fieldErrors: body?.erroes ?? [],
      };

      return throwError(() => appError);
    }),
  );

function defaultMessageFor(status: number): string {
  switch (status) {
    case 0:
      return 'Could not reach the server. Check your connection and try again.';
    case 401:
      return 'You need to sign in to continue.';
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return 'The requested resource was not found.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
