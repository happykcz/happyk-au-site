
import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import FolderInputScreen from './components/FolderInputScreen';
import Header from './components/Header';
import PhotoGrid from './components/PhotoGrid';
import EditView from './components/EditView';
import { User, Photo } from './types';
import { DriveIcon } from './components/icons';
import { listPhotosInFolder } from './services/driveService';

declare global {
  const gapi: any;
  const google: any;
  interface Window {
    gapi?: any;
    google?: any;
  }
}

const parseGoogleApiError = (err: any): string => {
    if (!err) return 'An unknown error occurred.';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (typeof err !== 'object') return 'An unexpected error format was received.';

    // GAPI client error (e.g., from a drive.files.list call response)
    if (err.result?.error?.message) {
        return `Google API Error: ${err.result.error.message} (Code: ${err.result.error.code})`;
    }
    // GIS client error (e.g., from initTokenClient)
    if (err.type && err.details) {
        return `Google Sign-In Error: ${err.details} (Type: ${err.type}). Please check your Client ID configuration in Google Cloud Console.`;
    }
    // GAPI load error (often has just 'details')
    if (err.details && typeof err.details === 'string') {
        return `Initialization Error: ${err.details}`;
    }
    // Other common error object formats
    if (err.error?.message) {
        return `Error: ${err.error.message}`;
    }
    if (err.message) {
        return err.message;
    }

    // Fallback to a safe string representation
    try {
        const str = JSON.stringify(err);
        if (str !== '{}') {
            return `An unknown error occurred: ${str}`;
        }
    } catch (e) {
        // JSON.stringify failed, maybe a circular reference
    }

    // Final, most robust fallback
    return 'An unknown and non-serializable error occurred. Check the developer console for the original error object.';
};

type AppConfig = {
  clientId: string;
  googleApiKey?: string;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState<boolean>(false);
  const [folderId, setFolderId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async (id: string) => {
    setIsLoadingPhotos(true);
    setError(null);
    try {
      const result = await listPhotosInFolder(id);
      setPhotos(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load photos. Check folder permissions and URL.');
    } finally {
      setIsLoadingPhotos(false);
    }
  }, []);
  
  useEffect(() => {
    const initGoogleClients = async () => {
      console.info('[GDriveEnhancer] init start', {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname
      });
      // Helper to ensure a script is loaded by polling for the global object
      const waitForScript = <T,>(globalName: 'gapi' | 'google'): Promise<T> => {
        return new Promise((resolve, reject) => {
          let retries = 0;
          const interval = setInterval(() => {
            if (window[globalName]) {
              clearInterval(interval);
              console.info(`[GDriveEnhancer] ${globalName} loaded`);
              resolve(window[globalName] as T);
            }
            retries++;
            if (retries > 50) { // ~10 seconds timeout
              clearInterval(interval);
              const err = new Error(`Timed out waiting for ${globalName} to load.`);
              console.error('[GDriveEnhancer] script load timeout', globalName, err);
              reject(err);
            }
          }, 200);
        });
      };
      
      try {
        // 1) Load runtime config
        let runtimeCfg: AppConfig | null = null;
        try {
          const cfgUrl = new URL('./config.json', window.location.href).toString();
          console.info('[GDriveEnhancer] fetching config.json', { cfgUrl });
          const res = await fetch(cfgUrl, { cache: 'no-store' });
          console.info('[GDriveEnhancer] config.json response', { status: res.status, ok: res.ok, contentType: res.headers.get('content-type') });
          if (!res.ok) throw new Error(`Missing or inaccessible config.json (status ${res.status}).`);
          runtimeCfg = await res.json();
          console.info('[GDriveEnhancer] config.json parsed', { hasClientId: !!runtimeCfg?.clientId, googleApiKey: !!(runtimeCfg as any)?.googleApiKey, geminiApiKey: !!(runtimeCfg as any)?.geminiApiKey });
          setConfig(runtimeCfg);
        } catch (cfgErr) {
          console.warn('[GDriveEnhancer] config.json load failed, will try fallbacks', cfgErr);
          runtimeCfg = null; // continue to fallbacks
        }

        // Fallbacks: inline script config or URL param for quick testing
        if (!runtimeCfg?.clientId) {
          try {
            const inline = document.getElementById('app-config')?.textContent;
            if (inline) {
              const parsed = JSON.parse(inline);
              if (parsed && parsed.clientId) {
                runtimeCfg = { clientId: parsed.clientId, googleApiKey: parsed.googleApiKey };
                setConfig(runtimeCfg);
                console.info('[GDriveEnhancer] using inline #app-config clientId');
              }
            }
          } catch (e) {
            // ignore
          }
        }
        if (!runtimeCfg?.clientId) {
          const fromQuery = new URLSearchParams(window.location.search).get('client_id');
          if (fromQuery) {
            runtimeCfg = { clientId: fromQuery };
            setConfig(runtimeCfg);
            console.info('[GDriveEnhancer] using client_id from query string');
          }
        }

        // 2) Load Google scripts
        const [gapi, google] = await Promise.all([
          waitForScript<any>('gapi'), 
          waitForScript<any>('google')
        ]);
        
        await new Promise<void>((resolve, reject) => gapi.load('client', { callback: resolve, onerror: (e: any) => { console.error('[GDriveEnhancer] gapi.load error', e); reject(e); } }));

        await gapi.client.init({
          // Optional: API key only needed for some unauthenticated calls; OAuth token is primary.
          apiKey: runtimeCfg?.googleApiKey,
          discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
          ],
        });
        
        if (!runtimeCfg?.clientId) {
          console.error('[GDriveEnhancer] No clientId after all fallbacks');
          throw new Error('Google Client ID is missing. Place it in config.json (clientId), inline #app-config, or pass ?client_id=...');
        }

        const client = google.accounts.oauth2.initTokenClient({
          client_id: runtimeCfg.clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              console.info('[GDriveEnhancer] received access token');
              gapi.client.setToken(tokenResponse);
              try {
                // Use OpenID userinfo endpoint instead of People API to avoid extra API enablement.
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                if (!res.ok) throw new Error('Failed to fetch user profile');
                const info = await res.json();
                console.info('[GDriveEnhancer] userinfo loaded', { email: info?.email, name: info?.name });
                setUser({
                  name: info.name || info.given_name || 'User',
                  email: info.email || '',
                  avatarUrl: info.picture || `https://i.pravatar.cc/150?u=${info.email || 'user'}`,
                });
              } catch (err) {
                console.error("Error fetching user profile", err);
                setError("Could not fetch your Google profile information.");
              }
            }
          },
          error_callback: (error: any) => {
            console.error('Google token client error', error);
            const errorDetails = parseGoogleApiError(error);
            setError(`Google Sign-In failed. ${errorDetails}`);
          }
        });
        setTokenClient(client);
        setIsGisLoaded(true);
        console.info('[GDriveEnhancer] token client initialized');
      } catch (err: any) {
        console.error('Error during Google services initialization:', err);
        const message = parseGoogleApiError(err);
        setError(message);
        setIsGisLoaded(false);
      }
    };

    initGoogleClients();
  }, []); // The empty dependency array ensures this effect runs only once on mount.


  const handleLogin = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  };

  const handleLogout = () => {
      const token = gapi.client.getToken();
      if (token !== null) {
          google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken(null);
            setUser(null);
            setFolderId('');
            setPhotos([]);
            setError(null);
          });
      }
  };
  
  useEffect(() => {
    if (folderId) {
      fetchPhotos(folderId);
    }
  }, [folderId, fetchPhotos]);
  
  const parseFolderIdFromUrl = (url: string): string | null => {
    const regex = /(?:\/folders\/|id=)([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleLoadFolder = (url: string) => {
    setError(null);
    const id = parseFolderIdFromUrl(url);
    if (!id) {
      setError("Invalid Google Drive folder URL. Please paste a valid folder link.");
      return;
    }
    setFolderId(id);
  };
  
  const handleChangeFolder = () => {
    setFolderId('');
    setPhotos([]);
    setError(null);
  };

  const handleSelectPhoto = (photo: Photo) => {
    setSelectedPhotoId(photo.id);
  };

  const handleCloseEditView = () => {
    setSelectedPhotoId(null);
  };
  
  const handleSavePhoto = (updatedPhoto: Photo) => {
    setPhotos(currentPhotos => 
      currentPhotos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p)
    );
  };
  
  if (!user) {
    return <LoginScreen onLogin={handleLogin} isGisLoaded={isGisLoaded} error={error} />;
  }

  if (!folderId) {
    return <FolderInputScreen onLoadFolder={handleLoadFolder} error={error} />;
  }
  
  const selectedPhoto = photos.find(p => p.id === selectedPhotoId) || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} onLogout={handleLogout} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <DriveIcon className="w-6 h-6 mr-3 text-slate-500" />
              Enhancing Photos
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Currently viewing photos from your selected folder.
            </p>
          </div>
          <button 
            onClick={handleChangeFolder}
            className="px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-md shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Change Folder
          </button>
        </div>
        
        <PhotoGrid photos={photos} onSelectPhoto={handleSelectPhoto} isLoading={isLoadingPhotos} />
        {error && 
          <div className="text-center py-10">
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        }
      </main>
      {selectedPhoto && (
        <EditView 
          key={selectedPhoto.id} // Re-mount component when photo changes
          allPhotos={photos}
          initialPhoto={selectedPhoto}
          onClose={handleCloseEditView}
          onSave={handleSavePhoto} 
        />
      )}
    </div>
  );
};

export default App;
