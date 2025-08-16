
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  
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
      // Helper to ensure a script is loaded by polling for the global object
      const waitForScript = <T,>(globalName: 'gapi' | 'google'): Promise<T> => {
        return new Promise((resolve, reject) => {
          let retries = 0;
          const interval = setInterval(() => {
            if (window[globalName]) {
              clearInterval(interval);
              resolve(window[globalName] as T);
            }
            retries++;
            if (retries > 50) { // ~10 seconds timeout
              clearInterval(interval);
              reject(new Error(`Timed out waiting for ${globalName} to load.`));
            }
          }, 200);
        });
      };
      
      try {
        const [gapi, google] = await Promise.all([
          waitForScript<any>('gapi'), 
          waitForScript<any>('google')
        ]);
        
        await new Promise<void>((resolve, reject) => gapi.load('client', { callback: resolve, onerror: reject }));

        await gapi.client.init({
          apiKey: process.env.API_KEY,
          discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
            'https://www.googleapis.com/discovery/v1/apis/people/v1/rest'
          ],
        });
        
        if (!process.env.CLIENT_ID) {
            throw new Error('Google Client ID is missing. Please check your environment configuration.');
        }

        const client = google.accounts.oauth2.initTokenClient({
          client_id: process.env.CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              gapi.client.setToken(tokenResponse);
              try {
                const profile = await gapi.client.people.people.get({
                  resourceName: 'people/me',
                  personFields: 'names,emailAddresses,photos',
                });
                const { names, emailAddresses, photos } = profile.result;
                setUser({
                  name: names?.[0]?.displayName || 'User',
                  email: emailAddresses?.[0]?.value || '',
                  avatarUrl: photos?.[0]?.url || `https://i.pravatar.cc/150?u=${emailAddresses?.[0]?.value}`,
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
