import { roundMoney } from "@/lib/money";

// Given a raw `payments` array from the request body and the bill's grandTotal,
// validates/normalizes the entries and derives paidAmount, paymentStatus and a
// human-readable paymentMethod (so every existing single-string consumer —
// receipts, invoice list, reports, Room-Bill detection — keeps working
// unchanged for the common single-method case, and gets a readable summary
// like "Cash + bKash" for split bills).
export function computeSplitPayment(rawPayments, grandTotal, receivedBy) {
  const payments = (Array.isArray(rawPayments) ? rawPayments : [])
    .map((p) => ({
      paymentType: String(p?.paymentType || "").trim(),
      amount: roundMoney(p?.amount),
      transactionRef: p?.transactionRef ? String(p.transactionRef).trim() : "",
      receivedBy: p?.receivedBy || receivedBy || "",
      paidAt: p?.paidAt ? new Date(p.paidAt) : new Date(),
    }))
    .filter((p) => p.paymentType && p.amount > 0);

  const paidAmount = roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));

  const total = roundMoney(grandTotal);
  const paymentStatus =
    paidAmount >= total - 0.05 ? "Paid" : paidAmount > 0 ? "Partial" : "Unpaid";

  const paymentMethod =
    payments.length === 1
      ? payments[0].paymentType
      : payments.length > 1
      ? payments.map((p) => p.paymentType).join(" + ")
      : "";

  return { payments, paidAmount, paymentStatus, paymentMethod };
}
