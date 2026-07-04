export const calculateBill = (
  basePrice: number,
  pizzaPrice: number,
  toppingPrice: number,
  quantity: number
) => {
  const subtotal = (Number(basePrice) + Number(pizzaPrice) + Number(toppingPrice)) * quantity;
  const discount = quantity >= 5 ? subtotal * 0.10 : 0;
  const taxableAmount = subtotal - discount;
  const gst = taxableAmount * 0.18;
  const finalTotal = taxableAmount + gst;

  return {
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    gst: gst.toFixed(2),
    finalTotal: finalTotal.toFixed(2)
  };
};
