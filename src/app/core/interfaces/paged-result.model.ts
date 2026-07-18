/**
 * Generic mirror of Planura.Core.Application.Models.PagedResult<T>, used by
 * every admin list endpoint (vendors, clients, bookings, payments, ...).
 * Existing feature areas define one-off Paged*List interfaces per DTO; the
 * admin surface uses this generic instead since it has many paged lists
 * sharing the exact same envelope shape.
 */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
