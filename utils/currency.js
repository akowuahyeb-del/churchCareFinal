export const formatMoney = (
  amount,
  currencySymbol = "GH₵"
) => {

  return `${currencySymbol}${Number(
    amount || 0
  ).toLocaleString()}`;

};