// Define error object for a single plan's validation (either Monthly or Yearly)
export interface IPlanValidationErrors {
  productId?: string;
  priceId?: string;
  couponId?: string;
}

// Define error response for the entire request validation
export interface ICreatePlanValidationErrors {
  monthlyErrors?: IPlanValidationErrors;
  yearlyErrors?: IPlanValidationErrors;
}
