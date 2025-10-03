// client/src/components/AffiliateTracker.jsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

const AffiliateTracker = () => {
  const [affiliateInfo, setAffiliateInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check for affiliate code in URL parameters
    const urlParams = new URLSearchParams(location.search);
    const affiliateCode = urlParams.get('code') || urlParams.get('ref');

    if (affiliateCode) {
      trackAffiliateClick(affiliateCode);
    } else {
      // Check localStorage for existing affiliate tracking (instead of API call)
      checkExistingAffiliateTracking();
    }
  }, [location]);

  const trackAffiliateClick = async (code) => {
    try {
      const response = await api.post('/affiliate/track', {
        code: code.toUpperCase(),
        eventType: 'click',
        url: window.location.href,
        referrer: document.referrer
      });

      if (response.data.success && response.data.affiliateInfo) {
        // Store affiliate info in localStorage
        const affiliateData = {
          code: code.toUpperCase(),
          timestamp: new Date().toISOString(),
          ...response.data.affiliateInfo
        };
        
        localStorage.setItem('affiliate_tracking', JSON.stringify(affiliateData));
        setAffiliateInfo(response.data.affiliateInfo);
        setIsVisible(true);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
          setIsVisible(false);
        }, 10000);
      }
    } catch (error) {
      console.error('Error tracking affiliate click:', error);
      // Still store basic tracking data locally even if API fails
      if (code) {
        const basicData = {
          code: code.toUpperCase(),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('affiliate_tracking', JSON.stringify(basicData));
      }
    }
  };

  const checkExistingAffiliateTracking = () => {
    try {
      // Check localStorage instead of making API call
      const storedTracking = localStorage.getItem('affiliate_tracking');
      
      if (storedTracking) {
        const trackingData = JSON.parse(storedTracking);
        
        // Check if tracking is still valid (within 30 days)
        const trackingDate = new Date(trackingData.timestamp);
        const daysSinceTracking = (new Date() - trackingDate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceTracking <= 30) {
          setAffiliateInfo(trackingData);
          // Don't show banner for existing tracking, only for new ones
        } else {
          // Expired tracking, remove it
          localStorage.removeItem('affiliate_tracking');
        }
      }
    } catch (error) {
      console.error('Error checking existing affiliate tracking:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !affiliateInfo) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm bg-accent/95 backdrop-blur-sm text-dark p-4 rounded-lg shadow-2xl border border-accent-alt animate-slide-in-right">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-dark/60 hover:text-dark transition-colors"
        aria-label="Dismiss"
      >
        <i className="fas fa-times"></i>
      </button>
      
      <div className="flex items-start gap-3">
        <div className="text-2xl">
          <i className="fas fa-tag"></i>
        </div>
        
        <div>
          <h4 className="font-bold mb-1">Affiliate Discount Active!</h4>
          <p className="text-sm text-dark/80">
            {affiliateInfo.affiliateName || affiliateInfo.name ? (
              <>You're shopping with <strong>{affiliateInfo.affiliateName || affiliateInfo.name}</strong>'s special link.</>
            ) : (
              <>Special discount link applied!</>
            )}
          </p>
          {affiliateInfo.discount && (
            <p className="text-sm font-semibold mt-2">
              Save {affiliateInfo.discount}% on your order
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AffiliateTracker;