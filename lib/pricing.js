const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function calculateDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end - start) / MS_PER_DAY) + 1;
  return diff;
}

export function calculateBasePrice(days, dailyPrice, monthlyPriceCap) {
  const safeDays = Number(days || 0);
  const safeDailyPrice = Number(dailyPrice || 0);
  const safeMonthlyCap = Number(monthlyPriceCap || 0);

  // A monthly cap of 0 means disabled: use plain day pricing.
  if (safeMonthlyCap <= 0) {
    return safeDays * safeDailyPrice;
  }

  const fullMonths = Math.floor(safeDays / 30);
  const remainingDays = safeDays % 30;
  const basePrice = fullMonths * safeMonthlyCap + remainingDays * safeDailyPrice;
  const maxPrice = (fullMonths + 1) * safeMonthlyCap;
  return Math.min(basePrice, maxPrice);
}

export function calculateDiscountPrice(days, dailyPrice, monthlyPriceCap) {
  if (days >= 30) {
    return null;
  }

  let discount = 0;
  if (days >= 7 && days <= 13) discount = 0.15;
  if (days >= 14 && days <= 20) discount = 0.2;
  if (days >= 21 && days <= 29) discount = 0.25;

  if (discount === 0) return null;

  const normalPrice = days * dailyPrice;
  return normalPrice * (1 - discount);
}

export function calculateFinalPrice(days, dailyPrice, monthlyPriceCap) {
  const priceWithCap = calculateBasePrice(days, dailyPrice, monthlyPriceCap);
  const discountPrice = calculateDiscountPrice(days, dailyPrice, monthlyPriceCap);
  if (discountPrice == null) return priceWithCap;
  return Math.min(priceWithCap, discountPrice);
}

export function calculateIncludedKm(days) {
  return days * 200;
}

export function calculateFees(pickupLocation, deliveryLocation) {
  let deliveryFee = Number(pickupLocation.delivery_fee || 0);
  let pickupFee = Number(deliveryLocation.pickup_fee || 0);

  if (pickupLocation.name === 'Lavangen') {
    deliveryFee = 0;
  }

  if (deliveryLocation.name === 'Lavangen') {
    pickupFee = 0;
  }

  return { deliveryFee, pickupFee };
}

export function isValidLeadTime(startDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const diff = Math.ceil((start - today) / MS_PER_DAY);
  return diff >= 1;
}
