// client/src/hooks/usePreserveParams.js
// Custom hook to preserve query parameters (especially 'ref') across navigation

import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * Hook to generate URLs that preserve important query parameters
 * Specifically designed to maintain affiliate tracking via 'ref' parameter
 */
export const usePreserveParams = () => {
  const location = useLocation();

  // Parse current query parameters
  const currentParams = useMemo(() => {
    return new URLSearchParams(location.search);
  }, [location.search]);

  /**
   * Generate a URL with preserved parameters
   * @param {string} path - Target path (e.g., '/dashboard', '/#pricing')
   * @param {Object} additionalParams - Optional additional params to add
   * @returns {string} URL with preserved parameters
   */
  const getUrlWithParams = (path, additionalParams = {}) => {
    // Extract the ref parameter if it exists
    const refParam = currentParams.get('ref');
    
    // If no ref parameter exists, return path as-is (unless additionalParams provided)
    if (!refParam && Object.keys(additionalParams).length === 0) {
      return path;
    }

    // Build new search params
    const newParams = new URLSearchParams();
    
    // Always preserve 'ref' if it exists
    if (refParam) {
      newParams.set('ref', refParam);
    }

    // Add any additional parameters
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        newParams.set(key, value);
      }
    });

    // Split path into pathname and hash
    const [pathname, hash] = path.split('#');
    
    // Build final URL
    const searchString = newParams.toString();
    const hashString = hash ? `#${hash}` : '';
    
    return `${pathname}${searchString ? '?' + searchString : ''}${hashString}`;
  };

  /**
   * Get just the ref parameter value
   * @returns {string|null} The ref parameter value or null
   */
  const getRefParam = () => {
    return currentParams.get('ref');
  };

  /**
   * Check if a ref parameter exists
   * @returns {boolean}
   */
  const hasRefParam = () => {
    return currentParams.has('ref');
  };

  return {
    getUrlWithParams,
    getRefParam,
    hasRefParam,
    currentParams
  };
};

export default usePreserveParams;