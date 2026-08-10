import Swal from 'sweetalert2';

/**
 * Planura-styled SweetAlert2 confirmation shown before a vendor accepts a booking request (the
 * client's card is charged as part of accepting), reused by every vendor surface that exposes an
 * "accept" action. Mirrors confirmLogout()'s shape and reuses the same `.swal-planura-*` theming so
 * every confirmation dialog in the app looks and feels the same rather than falling back to the
 * native browser confirm().
 *
 * Contains no booking logic — it only asks the question and resolves `true`/`false`. Callers remain
 * fully responsible for calling the accept endpoint themselves.
 */
export function confirmAcceptBooking(): Promise<boolean> {
  return Swal.fire({
    title: 'Accept this booking request?',
    text: 'The client will be charged now.',
    showCancelButton: true,
    confirmButtonText: 'Yes, accept & charge',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    buttonsStyling: false,
    showClass: { popup: 'animate-scale-in' },
    // See confirmLogout(): SweetAlert2 waits for the popup's animationend before removing it from
    // the DOM, so an empty hideClass would leave the modal on screen forever after confirming.
    hideClass: { popup: 'animate-scale-out' },
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
