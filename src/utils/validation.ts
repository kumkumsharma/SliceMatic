export interface OrderFormData {
  customerName: string;
  phone: string;
  baseId: string;
  pizzaId: string;
  toppingId: string;
  quantity: number;
  paymentMode: string;
}

export const validateOrder = (formData: OrderFormData) => {
  const errors: Record<string, string> = {};
  
  // Name: Alphabets and spaces only, min 2 chars
  const nameRegex = /^[A-Za-z\s]{2,}$/;
  if (!formData.customerName.trim()) {
    errors.customerName = "Name is required.";
  } else if (!nameRegex.test(formData.customerName)) {
    errors.customerName = "Name must be at least 2 characters and contain alphabets only.";
  }

  // Phone: 10 digits, starts with 6,7,8,9
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!formData.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!phoneRegex.test(formData.phone)) {
    errors.phone = "Enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.";
  }

  if (!formData.baseId) errors.baseId = "Please select a crust.";
  if (!formData.pizzaId) errors.pizzaId = "Please select a pizza.";
  if (!formData.toppingId) errors.toppingId = "Please select a topping.";

  return errors;
};
