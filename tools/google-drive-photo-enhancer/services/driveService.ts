import { Photo } from '../types';

declare const gapi: any;

export const listPhotosInFolder = async (folderId: string): Promise<Photo[]> => {
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/gif' or mimeType='image/webp') and trashed=false`,
            fields: 'files(id, name, description, webContentLink, imageMediaMetadata(width, height), size)',
            pageSize: 100 // a reasonable limit
        });

        if (!response.result.files || response.result.files.length === 0) {
            return [];
        }

        const photos: Photo[] = response.result.files
            .filter((file: any) => file.imageMediaMetadata) // Ensure it's an image with metadata
            .map((file: any) => ({
                id: file.id,
                name: file.name,
                description: file.description || '',
                url: file.webContentLink.replace(/=s220$/, '=s1600'), // Request larger preview
                width: file.imageMediaMetadata?.width || 0,
                height: file.imageMediaMetadata?.height || 0,
                fileSize: parseInt(file.size, 10),
                author: '',
                copyright: '',
                adjustments: { brightness: 100, contrast: 100, saturation: 100 },
        }));
        
        return photos;
    } catch (err: any) {
        console.error("Google Drive API error:", err);
        if (err.status === 401) {
             throw new Error("Your session has expired. Please log out and log back in.");
        }
        if (err.status === 403) {
            throw new Error("Permission denied. You may not have access to this folder, or third-party cookies are blocked.");
        }
        if (err.status === 404) {
            throw new Error("Folder not found. Please check the URL.");
        }
        throw new Error("An error occurred while fetching photos from Google Drive.");
    }
};
