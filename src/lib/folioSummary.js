// Shared totals/category-breakdown calculation for Folio Ledger entries,
// used by both the ledger view and the checkout settlement summary so the
// numbers can't drift between the two.
export const getFolioSummary = (entries) => {
  const list = Array.isArray(entries) ? entries : [];

  const totalDebit = list.reduce((acc, e) => acc + (e.debit || 0), 0);
  const totalCredit = list.reduce((acc, e) => acc + (e.credit || 0), 0);
  const outstandingDue = totalDebit - totalCredit;

  const roomTotal = list.filter(e => e.type === "Room Charge").reduce((acc, e) => acc + (e.debit || 0), 0);
  const foodTotal = list.filter(e => e.type === "Food Charge").reduce((acc, e) => acc + (e.debit || 0), 0);
  const serviceTotal = list.filter(e => e.type === "Service Charge").reduce((acc, e) => acc + (e.debit || 0), 0);
  const paymentsTotal = list.filter(e => e.type === "Payment" || e.type === "Advance Payment").reduce((acc, e) => acc + (e.credit || 0), 0);
  const discountTotal = list.filter(e => e.type === "Discount").reduce((acc, e) => acc + (e.credit || 0), 0);

  return {
    totalDebit,
    totalCredit,
    outstandingDue,
    roomTotal,
    foodTotal,
    serviceTotal,
    paymentsTotal,
    discountTotal
  };
};
