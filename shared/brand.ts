/** All provisional brand identity belongs here. */
export const brand = {
  name: "رِواق",
  latin: "riwaq",
  tagline: "مساحة أكبر لتجارتك",
  currency: "IQD",
  trialDays: 14,
} as const;
export const plans = {
  basic: { name: "المتجر", products: 100, instagram: false },
  plus: { name: "المتجر + المساعد", products: 500, instagram: true },
  delivery: { name: "التجارة المتكاملة", products: 1000, instagram: true },
} as const;
export type Plan = keyof typeof plans;
export const money = (n: number) =>
  `${new Intl.NumberFormat("ar-IQ").format(n)} د.ع`;
export const orderStatuses = {
  new: "جديد",
  confirmed: "مؤكد",
  preparing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "مكتمل",
  cancelled: "ملغي",
} as const;
