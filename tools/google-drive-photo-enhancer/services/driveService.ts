import { Photo } from '../types';

export const listPhotosInFolder = async (folderId: string, accessToken: string): Promise<Photo[]> => {
  if (!accessToken) throw new Error('Not authenticated. Missing access token.');
  const endpoint = new URL('https://www.googleapis.com/drive/v3/files');
  const q = `'${folderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/gif' or mimeType='image/webp') and trashed=false`;
  endpoint.searchParams.set('q', q);
  endpoint.searchParams.set('fields', 'files(id,name,description,thumbnailLink,webViewLink,imageMediaMetadata(width,height),size)');
  endpoint.searchParams.set('pageSize', '100');
  const res = await fetch(endpoint.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Your session has expired. Please log out and log back in.');
    if (res.status === 403) throw new Error('Permission denied. You may not have access to this folder, or third-party cookies are blocked.');
    if (res.status === 404) throw new Error('Folder not found. Please check the URL.');
    throw new Error('An error occurred while fetching photos from Google Drive.');
  }
  const data = await res.json();
  const files = Array.isArray(data.files) ? data.files : [];
  const photos: Photo[] = files
    .filter((file: any) => file.imageMediaMetadata)
    .map((file: any) => {
      const thumb = file.thumbnailLink || '';
      const largeThumb = thumb ? thumb.replace(/=s\d+(-c)?$/, '=s1600') : '';
      return {
        id: file.id,
        name: file.name,
        description: file.description || '',
        url: largeThumb || file.webViewLink,
        width: file.imageMediaMetadata?.width || 0,
        height: file.imageMediaMetadata?.height || 0,
        fileSize: parseInt(file.size, 10),
        author: '',
        copyright: '',
        adjustments: { brightness: 100, contrast: 100, saturation: 100 },
      } as Photo;
    });
  return photos;
};
