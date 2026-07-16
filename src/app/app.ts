import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ChatbotWidget } from './shared/ui/chatbot-widget/chatbot-widget';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatbotWidget],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly authService = inject(AuthService);

  protected readonly title = signal('Planura-Client');

  // Mounted here (app root) rather than inside client-shell so it also
  // covers the post-login home page at '/', which sits outside client-shell,
  // and survives every route change since app-root never unmounts.
  protected readonly showChatbot = computed(
    () => this.authService.isAuthenticated() && this.authService.isClient(),
  );
}
