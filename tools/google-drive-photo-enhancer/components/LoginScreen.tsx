import React from 'react';
import { GoogleIcon, SparklesIcon } from './icons';

interface LoginScreenProps {
  onLogin: () => void;
  isGisLoaded: boolean;
  error?: string | null;
  resolvedClientId?: string | null;
  clientIdSource?: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isGisLoaded, error, resolvedClientId, clientIdSource }) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card text-center p-8 max-w-xl w-full mx-auto">
        <div className="inline-flex items-center gap-3 mb-4 justify-center">
          <img src="/assets/logo.svg" alt="happyk.au" height={36} />
          <span className="pill">Tools</span>
        </div>
        <h1 className="text-3xl font-semibold mb-3">AI Photo <span className="accent">Enhancer</span></h1>
        <p className="text-[0.95rem] text-[#c9ced6] mb-6">
          Sign in with Google to select a Drive folder and enhance photos for the web.
        </p>
        <div className="text-xs text-left mx-auto mb-4 p-3 rounded-md border border-slate-300 bg-slate-100 text-slate-700">
          <div className="font-semibold mb-1">Runtime Config</div>
          <div>Resolved Client ID: <span className="font-mono">{resolvedClientId || '(not detected)'}</span></div>
          <div>Source: <span className="font-mono">{clientIdSource || '(n/a)'}</span></div>
        </div>
        
        {error && (
          <div className="text-left p-3 rounded-md border border-red-600/40 bg-red-900/30 text-red-200 mb-4" role="alert">
            <div className="font-semibold">Initialization Error</div>
            <div className="text-sm opacity-90">{error}</div>
          </div>
        )}
        <button
          onClick={onLogin}
          disabled={!isGisLoaded}
          className="inline-flex items-center justify-center px-6 py-3 bg-[#1f2937] text-[#eaeaea] font-medium rounded-lg border border-[#2a3040] hover:bg-[#273142] transition-colors disabled:opacity-60 disabled:cursor-wait"
        >
          <GoogleIcon className="w-5 h-5 mr-2" />
          {isGisLoaded ? 'Sign in with Google' : 'Initializing...'}
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
