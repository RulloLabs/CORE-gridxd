// Stripe product & price IDs for GridXD plans
export const STRIPE_PLANS = {
  pro: {
    product_id: "prod_TPDRgnDAWN0YGl",
    price_id: "price_1SSP0dCBRYmxvPcdWgLV2hOw",
    name: "Pro",
    price: "9€/mes",
  },
  proplus: {
    product_id: "prod_TPFYLTuQtsdQbY",
    price_id: "price_1SSR35CBRYmxvPcdkZsD0t32",
    name: "Pro+",
    price: "19€/mes",
  },
} as const;

