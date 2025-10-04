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
// Modern Stripe initialization - pass ONLY the key to loadStripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

console.log('Stripe key loaded:', import.meta.env.VITE_STRIPE_PUBLIC_KEY ? 
  `${import.meta.env.VITE_STRIPE_PUBLIC_KEY.substring(0, 7)}...` : 'NOT FOUND');

// Options go on Elements component, NOT loadStripe
const options = {
  appearance: {
    theme: 'night',
    variables: {
      colorPrimary: '#C4A064',
      colorBackground: '#1A1A1A',
      colorText: '#ffffff',
      colorDanger: '#ff3e6c',
      fontFamily: 'Montserrat, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  },
  // Note: locale and currency are set per PaymentIntent, not here
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Elements stripe={stripePromise} options={options}>
      <App />
    </Elements>
  </React.StrictMode>
);