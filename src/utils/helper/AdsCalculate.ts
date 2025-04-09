export const AdsCalculate = (rangeDate: number, price: number) => {
  const basePricePerDay = price; // 30,000
  const pricePerDayWithVAT = basePricePerDay * 1.1; // 33,000
  return pricePerDayWithVAT * rangeDate; // Tổng giá
};