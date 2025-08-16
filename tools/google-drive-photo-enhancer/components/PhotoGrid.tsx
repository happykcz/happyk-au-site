import React from 'react';
import { Photo } from '../types';

interface PhotoGridProps {
  photos: Photo[];
  onSelectPhoto: (photo: Photo) => void;
  isLoading: boolean;
}

const PhotoThumbnail: React.FC<{ photo: Photo, onSelectPhoto: (photo: Photo) => void }> = ({ photo, onSelectPhoto }) => {
  return (
    <div className="group relative overflow-hidden rounded-lg shadow-md bg-slate-200 transition-shadow duration-300 hover:shadow-xl">
      <img src={photo.url} alt={`Thumbnail of ${photo.name}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-0 left-0 p-4">
        <h3 className="text-white font-semibold truncate" title={photo.name}>
          {photo.name}
        </h3>
        <p className="text-xs text-slate-300">{photo.width} x {photo.height}</p>
      </div>
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={() => onSelectPhoto(photo)}
          className="px-4 py-2 bg-white text-slate-800 font-semibold rounded-md shadow-sm hover:bg-slate-100 transition-colors"
        >
          Edit & Enhance
        </button>
      </div>
    </div>
  );
};

const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onSelectPhoto, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="aspect-[4/3] bg-slate-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold text-slate-700">No Photos Found</h3>
        <p className="text-slate-500 mt-2">Please select a Google Drive folder to begin.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {photos.map(photo => (
        <PhotoThumbnail key={photo.id} photo={photo} onSelectPhoto={onSelectPhoto} />
      ))}
    </div>
  );
};

export default PhotoGrid;