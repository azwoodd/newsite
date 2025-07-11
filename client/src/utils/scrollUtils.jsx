/**
 * Smooth scroll to an element by ID with improved reliability
 * @param {string} elementId - The ID of the element to scroll to
 * @param {number} offset - Offset from the top in pixels (e.g., for fixed headers)
 */
export const smoothScrollTo = (elementId, offset = 80) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with ID '${elementId}' not found`);
    return;
  }
  
  // Calculate the element's position relative to the document
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;
  
  // Use native smooth scrolling when supported
  if ('scrollBehavior' in document.documentElement.style) {
    try {
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    } catch (error) {
      // Fallback if smooth scrolling fails
      fallbackScroll(offsetPosition);
    }
  } else {
    // Fallback for browsers that don't support smooth scrolling
    fallbackScroll(offsetPosition);
  }
};

/**
 * Fallback scrolling function using animation frame for browsers without scrollBehavior support
 * @param {number} targetY - Target Y position to scroll to
 */
const fallbackScroll = (targetY) => {
  const duration = 600; // Duration in ms
  const startTime = performance.now();
  const startY = window.pageYOffset;
  const distance = targetY - startY;
  
  const easeInOutQuad = (t) => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  };
  
  const animation = (currentTime) => {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const easedProgress = easeInOutQuad(progress);
    
    window.scrollTo(0, startY + distance * easedProgress);
    
    if (elapsedTime < duration) {
      requestAnimationFrame(animation);
    }
  };
  
  requestAnimationFrame(animation);
};

/**
 * Check if the device is a mobile/touch device
 * @returns {boolean} True if the device is a mobile device
 */
export const isMobileDevice = () => {
  return (
    typeof window.orientation !== 'undefined' ||
    navigator.userAgent.indexOf('IEMobile') !== -1 ||
    window.matchMedia('(max-width: 768px)').matches
  );
};