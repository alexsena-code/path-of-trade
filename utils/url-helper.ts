/**
 * Utilities for handling currency names and URLs
 */

/**
 * Safely encode product names for use in URLs
 * Handles special characters in currency names
 */
export const encodeProductName = (name: string): string => {
  // First normalize the string (handle accents, etc.)
  const normalized = name.normalize('NFD');

  // Replace spaces with hyphens, remove problematic characters, and lowercase
  const slugified = normalized
    .toLowerCase()
    .replace(/[\s\+\&\%\#\@\!\(\)\[\]\{\}\:\;\'\"\,\.\?\<\>\/\\\|]/g, '-')
    .replace(/--+/g, '-')  // Replace multiple hyphens with a single one
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Finally, encode the result for URL safety
  return encodeURIComponent(slugified);
};

// ... (decodeProductName remains same or should be updated to match? 
// If we change encoding to lowercase, decoding might fail to restore capitalization directly.
// But parseProductSlug puts it back to title case via regex replacement in decodeProductName.
// existing decodeProductName: .replace(/\b\w/g, (char) => char.toUpperCase()); -> This handles re-capitalization!
// So lowercase encoding is safe.)

/**
 * Decode a slugified product name back to a readable format
 */
export const decodeProductName = (slug: string): string => {
  const decoded = decodeURIComponent(slug);

  // Replace hyphens with spaces and capitalize first letter of each word
  return decoded
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Generate a full, secure URL for a product
 */
export const getProductUrl = (
  productName: string,
  locale: string,
  league?: string,
  difficulty?: string
): string => {
  // Create base URL with encoded product name
  // Validate locale to ensure no double slashes if empty (though it should be provided)
  const langPrefix = locale ? `/${locale}` : '';
  const baseUrl = `${langPrefix}/products/${encodeProductName(productName)}`;

  // Add query parameters if they exist
  const params = new URLSearchParams();
  if (league && league !== 'any') params.set('league', league);
  if (difficulty && difficulty !== 'any') params.set('difficulty', difficulty);
  // Add gameVersion if needed? The user didn't ask, but ProductCard was adding it.
  // Preserving behavior if passed, but cleaner signature might be better. 
  // For now, let's stick to the prompt's request for clean URLs.

  // Construct final URL
  const queryString = params.toString();
  return `${baseUrl}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Ensure URLs always use HTTPS
 */
export const enforceHttps = (url: string): string => {
  // If it's an absolute URL starting with http, make sure it's https
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }

  // If it's a relative URL or already https, return as is
  return url;
};

/**
 * Parse a product slug back into a readable name
 */
export const parseProductSlug = (slug: string): string => {
  try {
    return decodeProductName(slug);
  } catch (error) {
    // Fallback in case of decoding errors
    return slug.replace(/-/g, ' ');
  }
}; 