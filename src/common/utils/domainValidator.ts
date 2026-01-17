/**
 * Domain validation and normalization utilities
 */

/**
 * Validates if a string is a valid domain
 * @param domain - Domain string to validate
 * @returns true if valid domain, false otherwise
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Remove protocol if present
  let cleanDomain = domain.trim().toLowerCase();
  cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
  cleanDomain = cleanDomain.replace(/^www\./, '');
  cleanDomain = cleanDomain.split('/')[0]; // Remove path
  cleanDomain = cleanDomain.split('?')[0]; // Remove query params
  cleanDomain = cleanDomain.split('#')[0]; // Remove hash

  // Basic domain regex pattern
  // Allows: subdomain.domain.tld, domain.tld
  // Rejects: IPs, localhost, invalid formats
  const domainPattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

  // Reject IP addresses
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(cleanDomain)) {
    return false;
  }

  // Reject localhost
  if (cleanDomain === 'localhost' || cleanDomain.startsWith('localhost.')) {
    return false;
  }

  // Reject if contains invalid characters
  if (!domainPattern.test(cleanDomain)) {
    return false;
  }

  // Reject if too short or too long
  if (cleanDomain.length < 3 || cleanDomain.length > 253) {
    return false;
  }

  return true;
}

/**
 * Normalizes a domain string
 * - Removes protocol (http://, https://)
 * - Removes www. prefix
 * - Converts to lowercase
 * - Removes path, query params, hash
 * @param domain - Domain string to normalize
 * @returns Normalized domain string
 * @throws Error if domain is invalid
 */
export function normalizeDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain must be a non-empty string');
  }

  let normalized = domain.trim().toLowerCase();

  // Remove protocol
  normalized = normalized.replace(/^https?:\/\//, '');

  // Remove www. prefix
  normalized = normalized.replace(/^www\./, '');

  // Remove path, query params, hash
  normalized = normalized.split('/')[0];
  normalized = normalized.split('?')[0];
  normalized = normalized.split('#')[0];

  // Remove trailing dot
  normalized = normalized.replace(/\.$/, '');

  // Validate
  if (!isValidDomain(normalized)) {
    throw new Error(`Invalid domain format: ${domain}`);
  }

  return normalized;
}
