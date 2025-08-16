import React, { useState } from 'react';
import { DriveIcon } from './icons';

interface FolderInputScreenProps {
  onLoadFolder: (url: string) => void;
  error?: string | null;
}

const FolderInputScreen: React.FC<FolderInputScreenProps> = ({ onLoadFolder, error }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      onLoadFolder(url);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center p-8 max-w-2xl mx-auto w-full">
        <div className="inline-block p-4 bg-blue-100 rounded-full mb-6">
          <DriveIcon className="w-12 h-12 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-4">AI Photo Enhancer</h1>
        <p className="text-slate-600 text-lg mb-8">
          Paste a Google Drive folder link to get started. The app will simulate loading photos from the folder.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              required
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-slate-900"
              aria-label="Google Drive folder URL"
            />
            <button
              type="submit"
              disabled={!url}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              <DriveIcon className="w-5 h-5 mr-2" />
              Load Photos
            </button>
          </div>
           {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </form>
        <p className="text-xs text-slate-500 mt-4">
            Example: <code>https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ</code>
        </p>
      </div>
    </div>
  );
};

export default FolderInputScreen;
