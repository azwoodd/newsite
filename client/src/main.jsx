import React from 'react';
import ReactDOM from 'react-dom/client';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import App from './App.jsx';
import './index.css';

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
// Use the key directly from the environment variable
// This is your test publishable API key.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Log the Stripe key for debugging (redacted for security)
console.log('Stripe key loaded:', import.meta.env.VITE_STRIPE_PUBLIC_KEY ? 
  `${import.meta.env.VITE_STRIPE_PUBLIC_KEY.substring(0, 7)}...` : 'NOT FOUND');

// The options object configures how Elements behaves
const options = {
  // Stripe will automatically check for saved payment methods for returning customers
  appearance: {
    theme: 'night',
    variables: {
      colorPrimary: '#C4A064', // Match your accent color
      colorBackground: '#1A1A1A',
      colorText: '#ffffff',
      colorDanger: '#ff3e6c',
      fontFamily: 'Montserrat, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  },
  // Update locale and currency
  locale: 'en-GB',  // British English
  currency: 'gbp',  // GBP (£)
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Elements stripe={stripePromise} options={options}>
      <App />
    </Elements>
  </React.StrictMode>
);