import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Hide loader as soon as React renders
const hideLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.transition = 'opacity 0.3s ease-out';
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 350);
  }
};

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Give React a moment to paint, then hide the loader
requestAnimationFrame(() => {
  requestAnimationFrame(hideLoader);
});
