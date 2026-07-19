import Swal from 'sweetalert2';

/**
 * Admin-themed SweetAlert2 notifications — same library as the main app's
 * notify.ts, but styled with the .swal-admin-* classes (admin-theme.css)
 * instead of .swal-planura-*, so toasts/alerts match the indigo/purple admin
 * palette rather than the main site's warm coral theme.
 */

export function adminNotifySuccess(message: string): void {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: message,
    showConfirmButton: false,
    timer: 2600,
    timerProgressBar: true,
    buttonsStyling: false,
    customClass: { popup: 'swal-admin-toast' },
  });
}

export function adminNotifyError(title: string, text?: string): void {
  Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'OK',
    buttonsStyling: false,
    showClass: { popup: 'admin-animate-scale-in' },
    hideClass: { popup: '' },
    customClass: {
      popup: 'swal-admin-popup',
      confirmButton: 'admin-btn admin-btn--primary',
    },
  });
}
