/**
 * Atomic Unit Conversion System
 * 
 * This module handles conversion of bulk items to atomic/standardized units
 * for consistent inventory tracking and recipe deduction.
 */

// Standard bulk-to-atomic conversions
export interface BulkConversion {
  pattern: RegExp;
  standardName: string;
  atomicUnit: string;
  multiplier: number;
}

// Common bulk item conversions
export const BULK_CONVERSIONS: BulkConversion[] = [
  // Eggs
  { pattern: /dozen\s+eggs?/i, standardName: 'Eggs', atomicUnit: 'count', multiplier: 12 },
  { pattern: /half\s+dozen\s+eggs?/i, standardName: 'Eggs', atomicUnit: 'count', multiplier: 6 },
  { pattern: /(\d+)\s*(?:ct|count|pk|pack)?\s*eggs?/i, standardName: 'Eggs', atomicUnit: 'count', multiplier: 1 },
  
  // Butter
  { pattern: /(\d+)?\s*(?:lb|pound)s?\s+butter/i, standardName: 'Butter', atomicUnit: 'sticks', multiplier: 4 },
  { pattern: /(\d+)?\s*sticks?\s+butter/i, standardName: 'Butter', atomicUnit: 'sticks', multiplier: 1 },
  
  // Milk (keep as gallons/half-gallons)
  { pattern: /gallon\s+(?:of\s+)?milk/i, standardName: 'Milk', atomicUnit: 'gallons', multiplier: 1 },
  { pattern: /half\s+gallon\s+(?:of\s+)?milk/i, standardName: 'Milk', atomicUnit: 'gallons', multiplier: 0.5 },
  { pattern: /quart\s+(?:of\s+)?milk/i, standardName: 'Milk', atomicUnit: 'quarts', multiplier: 1 },
  
  // Bread
  { pattern: /loaf\s+(?:of\s+)?bread/i, standardName: 'Bread', atomicUnit: 'slices', multiplier: 20 },
  { pattern: /loaves?\s+(?:of\s+)?bread/i, standardName: 'Bread', atomicUnit: 'slices', multiplier: 20 },
  
  // Bananas
  { pattern: /bunch\s+(?:of\s+)?bananas?/i, standardName: 'Bananas', atomicUnit: 'count', multiplier: 6 },
  
  // Soda/Drinks
  { pattern: /(\d+)\s*(?:pk|pack)\s+(?:of\s+)?(\w+)/i, standardName: '$2', atomicUnit: 'cans', multiplier: 1 },
  { pattern: /case\s+(?:of\s+)?(\w+)/i, standardName: '$1', atomicUnit: 'cans', multiplier: 24 },
  { pattern: /six\s*pack\s+(?:of\s+)?(\w+)/i, standardName: '$1', atomicUnit: 'cans', multiplier: 6 },
  { pattern: /twelve\s*pack\s+(?:of\s+)?(\w+)/i, standardName: '$1', atomicUnit: 'cans', multiplier: 12 },
];

// Standardized unit aliases (for normalization)
export const UNIT_ALIASES: Record<string, string> = {
  // Count units
  'piece': 'count',
  'pieces': 'count',
  'ct': 'count',
  'ea': 'count',
  'each': 'count',
  'item': 'count',
  'items': 'count',
  'unit': 'count',
  'units': 'count',
  
  // Weight
  'lb': 'lbs',
  'pound': 'lbs',
  'pounds': 'lbs',
  'oz': 'oz',
  'ounce': 'oz',
  'ounces': 'oz',
  'g': 'grams',
  'gram': 'grams',
  'kg': 'kg',
  'kilogram': 'kg',
  'kilograms': 'kg',
  
  // Volume
  'cup': 'cups',
  'tbsp': 'tbsp',
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'tsp': 'tsp',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'gal': 'gallons',
  'gallon': 'gallons',
  'qt': 'quarts',
  'quart': 'quarts',
  'pt': 'pints',
  'pint': 'pints',
  'ml': 'ml',
  'milliliter': 'ml',
  'milliliters': 'ml',
  'l': 'liters',
  'liter': 'liters',
  
  // Packaging
  'can': 'cans',
  'bottle': 'bottles',
  'jar': 'jars',
  'box': 'boxes',
  'bag': 'bags',
  'package': 'packages',
  'pack': 'packs',
  'stick': 'sticks',
  'slice': 'slices',
  'clove': 'cloves',
};

/**
 * Normalize a unit string to its standard form
 */
export function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] || lower;
}

/**
 * Standardize an item name for consistency
 */
export function standardizeItemName(name: string): string {
  return name
    .trim()
    // Remove size qualifiers
    .replace(/\b(large|medium|small|extra\s*large|jumbo)\s*/gi, '')
    // Remove brand-specific text in parentheses
    .replace(/\s*\([^)]*\)\s*/g, '')
    // Capitalize first letter
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

/**
 * Parse an item description and convert to atomic units
 */
export interface AtomicItem {
  name: string;
  quantity: number;
  unit: string;
  originalDescription?: string;
}

export function parseToAtomicUnits(description: string, inputQty: number = 1): AtomicItem {
  const lowerDesc = description.toLowerCase().trim();
  
  // Check against known bulk patterns
  for (const conversion of BULK_CONVERSIONS) {
    const match = lowerDesc.match(conversion.pattern);
    if (match) {
      // If pattern has a capture group for quantity, use it
      let extractedQty = 1;
      if (match[1] && !isNaN(parseInt(match[1]))) {
        extractedQty = parseInt(match[1]);
      }
      
      return {
        name: conversion.standardName.replace(/\$(\d+)/g, (_, n) => match[parseInt(n)] || '').trim(),
        quantity: inputQty * conversion.multiplier * extractedQty,
        unit: conversion.atomicUnit,
        originalDescription: description,
      };
    }
  }
  
  // No bulk pattern matched, return standardized version
  return {
    name: standardizeItemName(description),
    quantity: inputQty,
    unit: 'count',
    originalDescription: description,
  };
}

/**
 * Check if two units are compatible for comparison/deduction
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const norm1 = normalizeUnit(unit1);
  const norm2 = normalizeUnit(unit2);
  
  if (norm1 === norm2) return true;
  
  // Compatible unit groups
  const compatibleGroups = [
    ['count', 'pieces', 'items', 'units', 'each'],
    ['cups', 'tbsp', 'tsp', 'ml', 'liters'],
    ['lbs', 'oz', 'grams', 'kg'],
    ['gallons', 'quarts', 'pints'],
  ];
  
  for (const group of compatibleGroups) {
    if (group.includes(norm1) && group.includes(norm2)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Convert between compatible units (basic conversion)
 */
export function convertUnits(quantity: number, fromUnit: string, toUnit: string): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  
  if (from === to) return quantity;
  
  // Weight conversions
  const weightConversions: Record<string, number> = {
    'oz': 1,
    'lbs': 16,
    'grams': 0.035274,
    'kg': 35.274,
  };
  
  // Volume conversions (to tsp as base)
  const volumeConversions: Record<string, number> = {
    'tsp': 1,
    'tbsp': 3,
    'cups': 48,
    'ml': 0.202884,
    'liters': 202.884,
  };
  
  // Liquid conversions (to pints as base)
  const liquidConversions: Record<string, number> = {
    'pints': 1,
    'quarts': 2,
    'gallons': 8,
  };
  
  // Try weight conversion
  if (from in weightConversions && to in weightConversions) {
    return (quantity * weightConversions[from]) / weightConversions[to];
  }
  
  // Try volume conversion
  if (from in volumeConversions && to in volumeConversions) {
    return (quantity * volumeConversions[from]) / volumeConversions[to];
  }
  
  // Try liquid conversion
  if (from in liquidConversions && to in liquidConversions) {
    return (quantity * liquidConversions[from]) / liquidConversions[to];
  }
  
  // No conversion available
  return null;
}

/**
 * Format quantity with unit for display
 */
export function formatQuantityWithUnit(quantity: number, unit: string): string {
  const normalizedUnit = normalizeUnit(unit);
  
  // Handle whole numbers
  if (quantity === Math.floor(quantity)) {
    return `${quantity} ${normalizedUnit}`;
  }
  
  // Handle fractions
  const fractionMap: Record<number, string> = {
    0.25: '¼',
    0.5: '½',
    0.75: '¾',
    0.33: '⅓',
    0.67: '⅔',
  };
  
  const whole = Math.floor(quantity);
  const fraction = quantity - whole;
  
  for (const [value, symbol] of Object.entries(fractionMap)) {
    if (Math.abs(fraction - parseFloat(value)) < 0.05) {
      return whole > 0 ? `${whole} ${symbol} ${normalizedUnit}` : `${symbol} ${normalizedUnit}`;
    }
  }
  
  // Round to 1 decimal place
  return `${Math.round(quantity * 10) / 10} ${normalizedUnit}`;
}
