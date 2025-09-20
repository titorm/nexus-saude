import { clsx, type ClassValue } from 'clsx';

/**
 * Utility function to merge CSS classes using clsx
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
