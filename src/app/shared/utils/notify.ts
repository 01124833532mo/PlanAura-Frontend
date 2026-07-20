import Swal from 'sweetalert2';

/**
 * Planura-styled SweetAlert2 success/error notifications. Reuses the same
 * `.swal-planura-*` theme classes as confirmLogout() (see confirm-logout.ts
 * and the "SweetAlert2 theming" block in src/styles.css) so every Swal-based
 * dialog in the app looks consistent.
 *
 * These are pure presentation helpers — no business logic, no API calls.
 * Callers pass in whatever message they already have (e.g. from an AppError).
 */

/** Brief, non-blocking success toast (top-right, auto-dismisses). */
export function notifySuccess(message: string): void {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    iconColor: 'var(--color-success)',
    title: message,
    showConfirmButton: false,
    timer: 2600,
    timerProgressBar: true,
    buttonsStyling: false,
    customClass: {
      popup: 'swal-planura-toast',
    },
  });
}

/** Blocking error modal the user must acknowledge — for failures that need attention. */
export function notifyError(title: string, text?: string): void {
  Swal.fire({
    icon: 'error',
    iconColor: 'var(--color-error)',
    title,
    text,
    confirmButtonText: 'OK',
    buttonsStyling: false,
    showClass: { popup: 'animate-scale-in' },
    // See confirm-logout.ts: an empty hideClass can leave the modal stuck in the
    // DOM because SweetAlert2 waits for an animationend that never fires.
    hideClass: { popup: 'animate-scale-out' },
    customClass: {
      container: 'swal-planura-container',
      popup: 'swal-planura-popup',
      title: 'swal-planura-title',
      htmlContainer: 'swal-planura-text',
      actions: 'swal-planura-actions',
      confirmButton: 'swal-planura-btn swal-planura-btn--confirm',
    },
  });
}
