import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
    // Resolves any session already sitting in localStorage before the
    // Router's first navigation runs. Blocking app-init here (rather than
    // letting guards fetch lazily) is what makes guards synchronous and
    // guarantees GET /api/auth/me fires at most once per page load.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).initializeSession())),
  ]
};
