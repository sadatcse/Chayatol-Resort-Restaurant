// Same algorithm as check-in's local generateIdempotencyKey, shared so
// every "post a charge/order" flow (food, service, payment, discount, ...)
// can tag its request the same way and let the API dedupe retries caused by
// a slow/flaky connection instead of creating a duplicate record.
export const generateIdempotencyKey = (prefix = "op") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
