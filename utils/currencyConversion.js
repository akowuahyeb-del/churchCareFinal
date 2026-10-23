export const convertFromBaseCurrency = (
  amount,
  currencyCode,
  exchangeRates = {}
) => {
  const rate =
    exchangeRates?.[currencyCode] || 1;

  return Number(amount || 0) * rate;
};

export const formatConvertedAmount = (
  amount,
  currencyCode,
  currencySymbol,
  exchangeRates = {}
) => {
  const converted =
    convertFromBaseCurrency(
      amount,
      currencyCode,
      exchangeRates
    );

  return `${currencySymbol}${converted.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
};