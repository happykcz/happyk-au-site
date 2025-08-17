
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Early module boot log/banner
try {
  console.info('[GDriveEnhancer] module start');
  const el=document.createElement('div');
  el.style.cssText='position:fixed;z-index:99996;bottom:8px;right:8px;background:#111;color:#fff;font:11px monospace;padding:4px 6px;border-radius:4px;opacity:.85;';
  el.textContent='module: loaded';
  document.addEventListener('DOMContentLoaded', function(){
    document.body.appendChild(el);
    setTimeout(function(){ if(el&&el.parentNode) el.parentNode.removeChild(el)}, 6000);
  });
} catch {}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
