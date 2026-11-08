function validatePurchase(body, validCategoryIds) {
  // V1: Server-side validation is authoritative; never coerce numeric strings.
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {error:'Purchase must be a JSON object'};
  if (typeof body.name !== 'string') return {error:'Investment name must be text'};
  const name = body.name.trim();
  if (name.length < 1 || name.length > 100) return {error:'Investment name must contain 1–100 characters'};
  if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 10000) return {error:'Quantity must be a whole number from 1 to 10,000'};
  if (!Number.isInteger(body.unitPriceCents) || body.unitPriceCents < 1 || body.unitPriceCents > 100000000) return {error:'Unit price must be between $0.01 and $1,000,000.00'};
  if (!Number.isInteger(body.categoryId) || !Array.isArray(validCategoryIds) || !validCategoryIds.includes(body.categoryId)) return {error:'Choose a valid category'};
  return {value:{name,quantity:body.quantity,unitPriceCents:body.unitPriceCents,categoryId:body.categoryId}};
}
module.exports={validatePurchase};
