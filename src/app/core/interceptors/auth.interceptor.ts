import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Attaches "Authorization: Bearer <token>" to every outgoing request when a
 * token is present. Mirrors how Swagger's Bearer scheme is configured on the
 * backend (Program.cs) — the raw token, standard "Bearer " prefix on the wire.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStorageService).getToken();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
