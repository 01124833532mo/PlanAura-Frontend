import Swal from 'sweetalert2';

/**
 * Planura-styled SweetAlert2 confirmation shown before logging out, reused
 * by every shell/page that exposes a logout action (client, vendor, admin,
 * and the auth page's already-signed-in state).
 *
 * This helper contains no auth logic whatsoever — it only asks the question
 * and resolves `true`/`false`. Callers remain fully responsible for calling
 * AuthService.logout() (and navigating away) themselves, exactly as they
 * did before this confirmation step was added.
 *
 * Visual theming lives in src/styles.css under the `.swal-planura-*`
 * classes so this modal matches the same card-luxe / gradient-button
 * language used by the rest of the app's dialogs (see confirm-dialog.css).
 */
export function confirmLogout(): Promise<boolean> {
  return Swal.fire({
    title: 'Are you sure you want to log out?',
    text: 'You will need to sign in again to access your account.',
    showCancelButton: true,
    confirmButtonText: 'Yes, Log Out',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    showClass: { popup: 'animate-scale-in' },
    hideClass: { popup: '' },
    customClass: {
      container: 'swal-planura-container',
      popup: 'swal-planura-popup',
      title: 'swal-planura-title',
      htmlContainer: 'swal-planura-text',
      actions: 'swal-planura-actions',
      confirmButton: 'swal-planura-btn swal-planura-btn--confirm',
      cancelButton: 'swal-planura-btn swal-planura-btn--cancel',
    },
  }).then((result) => result.isConfirmed);
}
