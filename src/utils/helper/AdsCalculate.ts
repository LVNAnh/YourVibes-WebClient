export const AdsCalculate = (rangeDate: number, price: number) => {
  const cost = rangeDate * price;
  return cost + cost * (10/100);
}