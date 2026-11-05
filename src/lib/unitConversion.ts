/**
 * Unit conversion utilities for ingredient scaling
 */

interface UnitConversion {
  from: string;
  to: string;
  threshold: number; // When qty >= threshold, convert
  factor: number;    // Divide qty by factor to get new unit
}

const UNIT_CONVERSIONS: UnitConversion[] = [
  // Volume conversions
  { from: 'tsp', to: 'tbsp', threshold: 3, factor: 3 },
  { from: 'tbsp', to: 'cup', threshold: 16, factor: 16 },
  { from: 'cup', to: 'cups', threshold: 2, factor: 1 }, // Pluralization
  { from: 'ml', to: 'l', threshold: 1000, factor: 1000 },
  { from: 'fl oz', to: 'cup', threshold: 8, factor: 8 },
  
  // Weight conversions
  { from: 'oz', to: 'lb', threshold: 16, factor: 16 },
  { from: 'g', to: 'kg', threshold: 1000, factor: 1000 },
];

// Normalize unit names for matching
const UNIT_ALIASES: Record<string, string> = {
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'cups': 'cup',
  'ounce': 'oz',
  'ounces': 'oz',
  'pound': 'lb',
  'pounds': 'lb',
  'gram': 'g',
  'grams': 'g',
  'kilogram': 'kg',
  'kilograms': 'kg',
  'liter': 'l',
  'liters': 'l',
  'milliliter': 'ml',
  'milliliters': 'ml',
};

/**
 * Normalize a unit string to its standard form
 */
export function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] || lower;
}

/**
 * Format a quantity for display (round to reasonable precision)
 */
export function formatQuantity(qty: number): string {
  if (qty === 0) return '0';
  
  // Handle common fractions
  const fractionMap: Record<number, string> = {
    0.25: '¼',
    0.5: '½',
    0.75: '¾',
    0.33: '⅓',
    0.67: '⅔',
    0.125: '⅛',
    0.375: '⅜',
    0.625: '⅝',
    0.875: '⅞',
  };
  
  const whole = Math.floor(qty);
  const fraction = qty - whole;
  
  // Check for common fractions
  const fractionKey = Object.keys(fractionMap).find(
    key => Math.abs(fraction - parseFloat(key)) < 0.05
  );
  
  if (fractionKey) {
    const fractionSymbol = fractionMap[parseFloat(fractionKey)];
    return whole > 0 ? `${whole} ${fractionSymbol}` : fractionSymbol;
  }
  
  // Round to 2 decimal places
  if (qty < 10) {
    return Math.round(qty * 100) / 100 + '';
  }
  
  // Round to 1 decimal for larger numbers
  return Math.round(qty * 10) / 10 + '';
}

/**
 * Convert quantity to larger unit if it exceeds threshold
 */
export function convertToLargerUnit(qty: number, unit: string): { qty: number; unit: string } {
  const normalizedUnit = normalizeUnit(unit);
  
  const conversion = UNIT_CONVERSIONS.find(
    c => c.from === normalizedUnit && qty >= c.threshold
  );
  
  if (conversion) {
    return {
      qty: qty / conversion.factor,
      unit: conversion.to,
    };
  }
  
  return { qty, unit };
}

/**
 * Display ingredient with smart unit conversion
 */
export function formatIngredient(qty: number, unit: string, item: string): string {
  const converted = convertToLargerUnit(qty, unit);
  const formattedQty = formatQuantity(converted.qty);
  
  return `${formattedQty} ${converted.unit} ${item}`.trim();
}
