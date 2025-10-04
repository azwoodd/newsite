// client/src/components/OrderForm/PromoCodeInput.jsx
import { useState, useEffect } from 'react';
import api from '../../services/api';

const PromoCodeInput = ({ orderValue, onPromoApplied, onPromoRemoved, disabled = false, initialCode = '' }) => {  const [promoCode, setPromoCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [validationTimeout, setValidationTimeout] = useState(null);

  // ✅ NEW: Auto-fill from initialCode prop
useEffect(() => {
  if (initialCode && !promoCode) {
    setPromoCode(initialCode);
  }
}, [initialCode]);

  // Debounced validation
  useEffect(() => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    if (promoCode.trim() && promoCode.length >= 3) {
      const timeout = setTimeout(() => {
        validatePromoCode(promoCode.trim());
      }, 500);
      setValidationTimeout(timeout);
    } else {
      setValidationMessage('');
      if (appliedPromo) {
        removePromo();
      }
    }

    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [promoCode, orderValue]);

  const validatePromoCode = async (code) => {
    if (!code || disabled) return;

    setIsValidating(true);
    setValidationMessage('');

    try {
      const response = await api.post('/checkout/apply-promo', {
        code: code.toUpperCase(),
        orderValue
      });

      if (response.data.success) {
        const breakdown = response.data.breakdown;
        setAppliedPromo(breakdown);
        setValidationMessage(`✓ ${breakdown.discountName} applied! Save £${breakdown.discountAmount.toFixed(2)}`);
        
        if (onPromoApplied) {
          onPromoApplied({
            ...breakdown,
            code: code.toUpperCase()
          });
        }
      } else {
        setAppliedPromo(null);
        setValidationMessage(`✗ ${response.data.error || 'Invalid promo code'}`);
        
        if (onPromoRemoved) {
          onPromoRemoved();
        }
      }
    } catch (error) {
      console.error('Promo validation error:', error);
      setAppliedPromo(null);
      setValidationMessage('✗ Error validating promo code');
      
      if (onPromoRemoved) {
        onPromoRemoved();
      }
    } finally {
      setIsValidating(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setValidationMessage('');
    if (onPromoRemoved) {
      onPromoRemoved();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setPromoCode(value);
  };

  const handleClearPromo = () => {
    setPromoCode('');
    removePromo();
  };

  return (
    <div className="promo-code-input">
      <div className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={promoCode}
            onChange={handleInputChange}
            placeholder="Enter promo code"
            disabled={disabled || isValidating}
            className={`w-full p-3 pr-12 bg-white/10 border-2 rounded-lg text-white uppercase transition-all focus:outline-none ${
              appliedPromo 
                ? 'border-green-500 bg-green-500/10' 
                : validationMessage.startsWith('✗') 
                ? 'border-red-500 bg-red-500/10' 
                : 'border-white/20 focus:border-accent focus:ring-2 focus:ring-accent/20'
            } ${disabled || isValidating ? 'opacity-60 cursor-not-allowed' : ''}`}
            maxLength={50}
          />
          {(promoCode || appliedPromo) && (
            <button
              type="button"
              onClick={handleClearPromo}
              className="absolute right-3 text-white/60 hover:text-white text-2xl leading-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
              title="Clear promo code"
            >
              ×
            </button>
          )}
        </div>
        
        {isValidating && (
          <div className="flex items-center gap-2 mt-2 text-sm text-light-muted">
            <div className="w-4 h-4 border-2 border-white/20 border-t-accent rounded-full animate-spin"></div>
            <span>Validating...</span>
          </div>
        )}
      </div>

      {validationMessage && (
        <div className={`mt-2 p-2 rounded text-sm font-medium ${
          appliedPromo 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {validationMessage}
        </div>
      )}

      {appliedPromo && (
        <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-light-muted">Subtotal:</span>
            <span>£{appliedPromo.originalTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1 text-green-400">
            <span>
              {appliedPromo.discountCode} 
              ({appliedPromo.discountType === 'percentage' 
                ? `${appliedPromo.discountValue}%` 
                : `£${appliedPromo.discountValue}`}):
            </span>
            <span>-£{appliedPromo.discountAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-white/10">
            <span>Total:</span>
            <span className="text-accent">£{appliedPromo.finalTotal.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodeInput;