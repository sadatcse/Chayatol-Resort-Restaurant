// Money amounts (subtotal, VAT, SD, SC, discount, delivery charge, grand total)
// are rounded to exactly one decimal place everywhere — never to a whole
// number (which silently changes the charged amount) and never to two
// decimals (which prints noise like "38.50" instead of "38.5").
export const roundMoney = (amt) => Math.round((Number(amt) || 0) * 10) / 10;

export const formatMoney = (amt) => roundMoney(amt).toFixed(1);
