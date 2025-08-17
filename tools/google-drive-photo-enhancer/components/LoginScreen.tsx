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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center p-8 max-w-lg mx-auto">
        <div className="inline-block p-4 bg-blue-100 rounded-full mb-6">
          <SparklesIcon className="w-12 h-12 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-4">AI Photo Enhancer</h1>
        <p className="text-slate-600 text-lg mb-8">
          Log in with your Google account to access your Drive, select a folder, and effortlessly enhance your photos for the web with AI-powered tools.
        </p>
        <div className="text-xs text-left mx-auto mb-4 p-3 rounded-md border border-slate-300 bg-slate-100 text-slate-700">
          <div className="font-semibold mb-1">Runtime Config</div>
          <div>Resolved Client ID: <span className="font-mono">{resolvedClientId || '(not detected)'}</span></div>
          <div>Source: <span className="font-mono">{clientIdSource || '(n/a)'}</span></div>
        </div>
        
        {error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4 text-left rounded-md" role="alert">
            <p className="font-bold">Initialization Error</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <button
            onClick={onLogin}
            disabled={!isGisLoaded}
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-slate-700 font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-wait"
          >
            <GoogleIcon className="w-6 h-6 mr-3" />
            {isGisLoaded ? 'Sign in with Google' : 'Initializing...'}
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
