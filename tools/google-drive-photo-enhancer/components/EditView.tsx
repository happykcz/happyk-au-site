import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Photo } from '../types';
import { SparklesIcon, CloseIcon, ChevronDownIcon, CropIcon, CheckIcon, ResetIcon } from './icons';
import { getAIAutoAdjustments, getAIDescription, getAICredits, getAIOptimization } from '../services/geminiService';

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-700">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center py-2 text-left text-slate-200">
        <span className="font-semibold">{title}</span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="pb-3 text-slate-400">{children}</div>}
    </div>
  );
};

const ToggleSwitch: React.FC<{ label: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm font-medium text-slate-300">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  </div>
);


const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const generateFilterStyle = (adjustments?: Photo['adjustments']) => {
    if (!adjustments) return {};
    const { brightness, contrast, saturation } = adjustments;
    return {
      filter: `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`,
    };
};

interface EditViewProps {
  allPhotos: Photo[];
  initialPhoto: Photo;
  onClose: () => void;
  onSave: (updatedPhoto: Photo) => void;
}

type Crop = { x: number; y: number; width: number; height: number };

const EditView: React.FC<EditViewProps> = ({ allPhotos, initialPhoto, onClose, onSave }) => {
  const [currentPhoto, setCurrentPhoto] = useState<Photo>(initialPhoto);
  const [editedPhoto, setEditedPhoto] = useState<Photo>({
    ...initialPhoto,
    adjustments: initialPhoto.adjustments || { brightness: 100, contrast: 100, saturation: 100 },
  });

  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, width: 100, height: 100 }); // in percentages
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [aiLoadingAction, setAiLoadingAction] = useState<null | 'enhance' | 'description' | 'credits' | 'optimize'>(null);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [unsavedChangesModal, setUnsavedChangesModal] = useState<{ isOpen: boolean; onConfirm?: () => void; }>({ isOpen: false });
  
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [actionStart, setActionStart] = useState<{ clientX: number, clientY: number, initialCrop: Crop } | null>(null);


  const handleUnload = useCallback((e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }, [isDirty]);

  useEffect(() => {
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [handleUnload]);

  const resetStateForNewPhoto = (newPhoto: Photo) => {
    setCurrentPhoto(newPhoto);
    setEditedPhoto({
      ...newPhoto,
      adjustments: newPhoto.adjustments || { brightness: 100, contrast: 100, saturation: 100 },
    });
    setCrop({ x: 0, y: 0, width: 100, height: 100 });
    setAspectRatio(null);
    setAiNotes(null);
    setIsDirty(false);
  };
  
  const attemptAction = (action: () => void) => {
      if (isDirty) {
          setUnsavedChangesModal({ isOpen: true, onConfirm: action });
      } else {
          action();
      }
  };

  const handleClose = () => {
    attemptAction(onClose);
  };
  
  const handleNavigateFilmstrip = (photoId: string) => {
      if (photoId === currentPhoto.id) return;
      const navigateAction = () => {
          const newPhoto = allPhotos.find(p => p.id === photoId);
          if (newPhoto) {
              resetStateForNewPhoto(newPhoto);
          }
      };
      attemptAction(navigateAction);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedPhoto(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };
  
  const handleAdjustmentChange = (adjustment: keyof Photo['adjustments'], value: number) => {
    setEditedPhoto(prev => ({
        ...prev,
        adjustments: {
            ...prev.adjustments!,
            [adjustment]: value
        }
    }));
    setIsDirty(true);
  };
  
  const handleAutoCrop = (newAspectRatio: number) => {
    setAspectRatio(newAspectRatio);
    const originalAspectRatio = currentPhoto.width / currentPhoto.height;
    let newCrop = { x: 0, y: 0, width: 100, height: 100 };

    if (newAspectRatio > originalAspectRatio) {
        newCrop.width = 100;
        newCrop.height = (originalAspectRatio / newAspectRatio) * 100;
        newCrop.x = 0;
        newCrop.y = (100 - newCrop.height) / 2;
    } else {
        newCrop.height = 100;
        newCrop.width = (newAspectRatio / originalAspectRatio) * 100;
        newCrop.y = 0;
        newCrop.x = (100 - newCrop.width) / 2;
    }
    setCrop(newCrop);
    setIsDirty(true);
  };

  const handleResetCrop = () => {
    setCrop({ x: 0, y: 0, width: 100, height: 100 });
    setAspectRatio(null);
    setIsDirty(true);
  }
  
  const handleDiscardChanges = () => {
      resetStateForNewPhoto(currentPhoto);
      setUnsavedChangesModal({ isOpen: false });
  };

    const handleAutoEnhance = async () => {
        setAiLoadingAction('enhance');
        setAiNotes(null);
        try {
            const suggestions = await getAIAutoAdjustments(currentPhoto.name);
            setEditedPhoto(prev => ({
                ...prev,
                adjustments: suggestions.adjustments,
            }));
            setAiNotes(suggestions.enhancementNotes);
            setIsDirty(true);
        } catch (error) {
            console.error("Failed to get AI auto adjustments:", error);
            setAiNotes("Sorry, an error occurred while auto-enhancing.");
        } finally {
            setAiLoadingAction(null);
        }
    };

    const handleGenerateDescription = async () => {
        setAiLoadingAction('description');
        setAiNotes(null);
        try {
            const suggestions = await getAIDescription(editedPhoto.name, editedPhoto.description);
            setEditedPhoto(prev => ({
                ...prev,
                description: suggestions.suggestedDescription,
            }));
            setAiNotes(suggestions.enhancementNotes);
            setIsDirty(true);
        } catch (error) {
            console.error("Failed to generate AI description:", error);
            setAiNotes("Sorry, an error occurred while generating a description.");
        } finally {
            setAiLoadingAction(null);
        }
    };

    const handleGenerateCredits = async () => {
        setAiLoadingAction('credits');
        setAiNotes(null);
        try {
            const suggestions = await getAICredits(editedPhoto.name, editedPhoto.description);
            setEditedPhoto(prev => ({
                ...prev,
                author: suggestions.author,
                copyright: suggestions.copyright,
            }));
            setAiNotes(suggestions.enhancementNotes);
            setIsDirty(true);
        } catch (error) {
            console.error("Failed to generate AI credits:", error);
            setAiNotes("Sorry, an error occurred while generating credits.");
        } finally {
            setAiLoadingAction(null);
        }
    };

    const handleOptimizeFile = async () => {
        setAiLoadingAction('optimize');
        setAiNotes(null);
        try {
            const suggestions = await getAIOptimization(currentPhoto.name, currentPhoto.fileSize);
            setEditedPhoto(prev => ({
                ...prev,
                name: suggestions.suggestedFileName,
                fileSize: suggestions.suggestedFileSize || prev.fileSize,
            }));
            setAiNotes(`${suggestions.enhancementNotes} (Suggested: ${suggestions.suggestedWidth}x${suggestions.suggestedHeight})`);
            setIsDirty(true);
        } catch (error) {
            console.error("Failed to optimize file details:", error);
            setAiNotes("Sorry, an error occurred while optimizing file details.");
        } finally {
            setAiLoadingAction(null);
        }
    };

  const handleSave = (andThen?: () => void) => {
    const finalWidth = Math.round(currentPhoto.width * (crop.width / 100));
    const finalHeight = Math.round(currentPhoto.height * (crop.height / 100));

    const photoToSave: Photo = {
        ...editedPhoto,
        width: finalWidth,
        height: finalHeight
    };

    onSave(photoToSave);
    setIsDirty(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
    
    if (andThen) {
      andThen();
    }
  };
  
  const handleActionStart = (e: React.MouseEvent, type: 'drag' | 'resize', handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'drag') {
      setIsDragging(true);
    } else if (type === 'resize' && handle) {
      setIsResizing(handle);
    }
    setActionStart({ clientX: e.clientX, clientY: e.clientY, initialCrop: crop });
  };

  const handleActionMove = useCallback((e: MouseEvent) => {
    if (!actionStart || !imageContainerRef.current) return;
    setIsDirty(true);
    const rect = imageContainerRef.current.getBoundingClientRect();
    const dx = e.clientX - actionStart.clientX;
    const dy = e.clientY - actionStart.clientY;
    const dxPercent = (dx / rect.width) * 100;
    const dyPercent = (dy / rect.height) * 100;
    const { initialCrop } = actionStart;

    if (isDragging) {
      const newX = Math.max(0, Math.min(100 - initialCrop.width, initialCrop.x + dxPercent));
      const newY = Math.max(0, Math.min(100 - initialCrop.height, initialCrop.y + dyPercent));
      setCrop(prev => ({ ...prev, x: newX, y: newY }));
      return;
    }

    if (isResizing) {
      let { x, y, width, height } = initialCrop;
      const MIN_SIZE = 5;

      // Calculate new tentative rect
      if (isResizing.includes('r')) width = initialCrop.width + dxPercent;
      if (isResizing.includes('l')) {
        width = initialCrop.width - dxPercent;
        x = initialCrop.x + dxPercent;
      }
      if (isResizing.includes('b')) height = initialCrop.height + dyPercent;
      if (isResizing.includes('t')) {
        height = initialCrop.height - dyPercent;
        y = initialCrop.y + dyPercent;
      }

      // Enforce aspect ratio
      if (aspectRatio) {
        const containerAspectRatio = rect.width / rect.height;
        const percentageAspectRatio = aspectRatio / containerAspectRatio;

        if (isResizing.length > 1) { // Corner resizing
          if (Math.abs(dxPercent) > Math.abs(dyPercent)) {
            height = width / percentageAspectRatio;
          } else {
            width = height * percentageAspectRatio;
          }
        } else if (isResizing.includes('l') || isResizing.includes('r')) { // Horizontal edge
          height = width / percentageAspectRatio;
        } else { // Vertical edge
          width = height * percentageAspectRatio;
        }

        // Adjust position for non-top-left handles
        if (isResizing.includes('l')) x = initialCrop.x + initialCrop.width - width;
        if (isResizing.includes('t')) y = initialCrop.y + initialCrop.height - height;
        
        // Center for edge resizing
        if (isResizing.length === 1) {
          if (isResizing.includes('l') || isResizing.includes('r')) {
            y = initialCrop.y + (initialCrop.height - height) / 2;
          } else {
            x = initialCrop.x + (initialCrop.width - width) / 2;
          }
        }
      }

      // Clamp size to boundaries while maintaining aspect ratio
      if (width < MIN_SIZE) width = MIN_SIZE;
      if (height < MIN_SIZE) height = MIN_SIZE;

      if (x < 0) {
        const newWidth = width + x;
        if (aspectRatio) {
          const newHeight = newWidth / (aspectRatio / (rect.width / rect.height));
          if (isResizing.includes('t')) y += height - newHeight;
          else if (!isResizing.includes('b')) y += (height - newHeight) / 2;
          height = newHeight;
        }
        width = newWidth;
        x = 0;
      }

      if (y < 0) {
        const newHeight = height + y;
        if (aspectRatio) {
          const newWidth = newHeight * (aspectRatio / (rect.width / rect.height));
          if (isResizing.includes('l')) x += width - newWidth;
          else if (!isResizing.includes('r')) x += (width - newWidth) / 2;
          width = newWidth;
        }
        height = newHeight;
        y = 0;
      }

      if (x + width > 100) {
        const newWidth = 100 - x;
        if (aspectRatio) {
          const newHeight = newWidth / (aspectRatio / (rect.width / rect.height));
          if (isResizing.includes('t')) y += height - newHeight;
          else if (!isResizing.includes('b')) y += (height - newHeight) / 2;
          height = newHeight;
        }
        width = newWidth;
      }

      if (y + height > 100) {
        const newHeight = 100 - y;
        if (aspectRatio) {
          const newWidth = newHeight * (aspectRatio / (rect.width / rect.height));
          if (isResizing.includes('l')) x += width - newWidth;
          else if (!isResizing.includes('r')) x += (width - newWidth) / 2;
          width = newWidth;
        }
        height = newHeight;
      }
      
      setCrop({ x, y, width, height });
    }
  }, [actionStart, isDragging, isResizing, aspectRatio]);


  const handleActionEnd = useCallback(() => {
      setIsDragging(false);
      setIsResizing(null);
      setActionStart(null);
  }, []);

  useEffect(() => {
    const isActionInProgress = isDragging || isResizing;
      if (isActionInProgress) {
          window.addEventListener('mousemove', handleActionMove);
          window.addEventListener('mouseup', handleActionEnd);
      }
      return () => {
          window.removeEventListener('mousemove', handleActionMove);
          window.removeEventListener('mouseup', handleActionEnd);
      };
  }, [isDragging, isResizing, handleActionMove, handleActionEnd]);


  const highResUrl = useMemo(() => currentPhoto.url.replace(/(\?w=\d+&h=\d+&fit=crop)/, '?w=1920'), [currentPhoto.url]);

  const displayPhoto = showOriginal ? currentPhoto : editedPhoto;
  const imageStyle = generateFilterStyle(showOriginal ? currentPhoto.adjustments : editedPhoto.adjustments);
  const croppedWidth = Math.round(currentPhoto.width * crop.width / 100);
  const croppedHeight = Math.round(currentPhoto.height * crop.height / 100);

  const resizeHandles: { pos: string, cursor: string }[] = [
      { pos: 'tl', cursor: 'cursor-nwse-resize' }, { pos: 'tr', cursor: 'cursor-nesw-resize' },
      { pos: 'bl', cursor: 'cursor-nesw-resize' }, { pos: 'br', cursor: 'cursor-nwse-resize' }
  ];


  return (
    <div className="fixed inset-0 bg-slate-900 text-white z-40 flex flex-col font-sans">
      {/* Header */}
      <header className="flex-shrink-0 bg-slate-800/50 backdrop-blur-sm flex items-center justify-between px-4 h-16 border-b border-slate-700">
        <div className="flex items-center">
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close editor">
                <CloseIcon className="w-6 h-6" />
            </button>
            <h1 className="ml-4 text-lg font-semibold truncate" title={currentPhoto.name}>{currentPhoto.name}</h1>
        </div>
        <div className="flex items-center gap-3">
            <button
                onClick={handleDiscardChanges}
                disabled={!isDirty}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                aria-label="Discard all changes"
                title="Discard all changes"
            >
                <ResetIcon className="w-6 h-6" />
            </button>
            <button
                onClick={() => handleSave()}
                disabled={!isDirty || aiLoadingAction !== null}
                className="relative px-5 py-2 text-sm font-semibold rounded-md bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
                Save
                {showSaved && <span className="absolute -top-2 -right-2 flex h-5 w-5">
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-white"/>
                  </span>
                </span>}
            </button>
            <button
                onClick={() => handleSave(onClose)}
                disabled={aiLoadingAction !== null}
                className="px-5 py-2 text-sm font-semibold rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
                Save & Close
            </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex overflow-hidden">
        {/* Editing Panel */}
        <aside className="w-[360px] flex-shrink-0 bg-slate-800 h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
           <h2 className="text-xl font-bold mb-3 text-slate-100">Enhance Photo</h2>
           <div className="space-y-1">
             <Accordion title="Preview" defaultOpen={true}>
                <ToggleSwitch label="View Original" checked={showOriginal} onChange={(e) => setShowOriginal(e.target.checked)} />
             </Accordion>
             <Accordion title="Details" defaultOpen={true}>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium text-slate-400 mb-1">Filename</label>
                    <input type="text" name="name" id="name" value={editedPhoto.name} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                    <textarea name="description" id="description" value={editedPhoto.description} onChange={handleInputChange} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
                  </div>
                  <div className="text-xs grid grid-cols-1 gap-1 text-slate-400">
                    <span>Resolution: <strong className="text-slate-300">{currentPhoto.width}x{currentPhoto.height}</strong></span>
                    <span>
                      File Size: {' '}
                      {editedPhoto.fileSize !== initialPhoto.fileSize ? (
                        <>
                          <s className="text-slate-500">{formatBytes(initialPhoto.fileSize)}</s>{' '}
                          <strong className="text-green-400">{formatBytes(editedPhoto.fileSize)}</strong>
                        </>
                      ) : (
                        <strong className="text-slate-300">{formatBytes(initialPhoto.fileSize)}</strong>
                      )}
                    </span>
                  </div>
                </div>
             </Accordion>
              <Accordion title="Adjustments" defaultOpen={true}>
                <div className="space-y-2">
                    <button
                        onClick={handleAutoEnhance}
                        disabled={aiLoadingAction !== null}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                    >
                        <SparklesIcon className={`w-5 h-5 ${aiLoadingAction === 'enhance' ? 'animate-spin' : ''}`} />
                        {aiLoadingAction === 'enhance' ? 'Enhancing...' : 'Auto Enhance'}
                    </button>
                    <div className="space-y-2 pt-2 border-t border-slate-700/50">
                        {(['brightness', 'contrast', 'saturation'] as const).map(adj => (
                            <div key={adj}>
                                <div className="flex justify-between items-center mb-1">
                                    <label htmlFor={adj} className="capitalize text-xs font-medium text-slate-400">{adj}</label>
                                    <span className="text-xs text-slate-500">{editedPhoto.adjustments![adj]}</span>
                                </div>
                                <input
                                    id={adj}
                                    type="range"
                                    min="0"
                                    max="200"
                                    value={editedPhoto.adjustments![adj]}
                                    onChange={(e) => handleAdjustmentChange(adj, parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        ))}
                    </div>
                </div>
              </Accordion>
              <Accordion title="Transform" defaultOpen={true}>
                <div className="space-y-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Auto-Crop</label>
                        <div className="grid grid-cols-5 gap-2">
                            <button onClick={() => handleAutoCrop(16/9)} className="px-2 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-md transition">16:9</button>
                            <button onClick={() => handleAutoCrop(4/5)} className="px-2 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-md transition">4:5</button>
                            <button onClick={() => handleAutoCrop(1/1)} className="px-2 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-md transition">1:1</button>
                            <button onClick={() => handleAutoCrop(3/2)} className="px-2 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-md transition">3:2</button>
                            <button onClick={handleResetCrop} className="px-2 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-md transition">Reset</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Output Dimensions</label>
                        <div className="flex items-center gap-2">
                          <input type="text" readOnly value={croppedWidth} className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-slate-400" />
                          <span className="text-slate-500">x</span>
                          <input type="text" readOnly value={croppedHeight} className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-slate-400" />
                        </div>
                    </div>
                </div>
              </Accordion>
              <Accordion title="Web & AI" defaultOpen={true}>
                  <div className="space-y-1.5">
                      <button onClick={handleOptimizeFile} disabled={aiLoadingAction !== null} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors">
                          <SparklesIcon className={`w-4 h-4 mr-1 ${aiLoadingAction === 'optimize' ? 'animate-spin' : ''}`} />
                          {aiLoadingAction === 'optimize' ? 'Optimizing...' : 'Optimize For Web'}
                      </button>
                      <button onClick={handleGenerateCredits} disabled={aiLoadingAction !== null} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors">
                          <SparklesIcon className={`w-4 h-4 mr-1 ${aiLoadingAction === 'credits' ? 'animate-spin' : ''}`} />
                          {aiLoadingAction === 'credits' ? 'Generating...' : 'Generate Credits'}
                      </button>
                      <button onClick={handleGenerateDescription} disabled={aiLoadingAction !== null} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors">
                          <SparklesIcon className={`w-4 h-4 mr-1 ${aiLoadingAction === 'description' ? 'animate-spin' : ''}`} />
                          {aiLoadingAction === 'description' ? 'Generating...' : 'Generate Description'}
                      </button>
                      
                      {aiNotes && (
                          <div className="!mt-3 p-3 bg-slate-700/50 border-l-4 border-blue-500 rounded">
                              <h4 className="font-semibold text-blue-300 text-sm">AI Enhancement Notes:</h4>
                              <p className="text-xs text-slate-300 mt-1">{aiNotes}</p>
                          </div>
                      )}
                  </div>
              </Accordion>
              <Accordion title="Metadata (EXIF)">
                <div className="space-y-2">
                    <p className="text-xs text-slate-500">This information can be embedded in the image file.</p>
                    <div>
                        <label htmlFor="author" className="block text-xs font-medium text-slate-400 mb-1">Author / Credit</label>
                        <input type="text" name="author" id="author" value={editedPhoto.author || ''} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div>
                        <label htmlFor="copyright" className="block text-xs font-medium text-slate-400 mb-1">Copyright</label>
                        <input type="text" name="copyright" id="copyright" value={editedPhoto.copyright || ''} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                </div>
              </Accordion>
           </div>
        </aside>

        {/* Image Preview */}
        <main className="flex-grow bg-black/50 h-full flex items-center justify-center p-8 overflow-hidden">
            <div 
              ref={imageContainerRef}
              className="relative max-w-full max-h-full select-none"
            >
              <img 
                src={highResUrl} 
                alt={`Editing ${currentPhoto.name}`} 
                className="max-w-full max-h-full object-contain block"
                style={imageStyle}
                draggable={false}
              />
              {!showOriginal && (
                <div 
                  className="absolute border-2 border-white/70 bg-black/20 cursor-move"
                  style={{
                    top: `${crop.y}%`,
                    left: `${crop.x}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  }}
                  onMouseDown={(e) => handleActionStart(e, 'drag')}
                >
                  <div className="absolute top-1/3 left-0 w-full h-px bg-white/40"></div>
                  <div className="absolute top-2/3 left-0 w-full h-px bg-white/40"></div>
                  <div className="absolute left-1/3 top-0 h-full w-px bg-white/40"></div>
                  <div className="absolute left-2/3 top-0 h-full w-px bg-white/40"></div>
                  {resizeHandles.map(({ pos, cursor }) => (
                    <div
                      key={pos}
                      onMouseDown={(e) => handleActionStart(e, 'resize', pos)}
                      className={`absolute w-3 h-3 bg-white rounded-full border border-slate-800 ${cursor}
                        ${pos.includes('t') ? '-top-1.5' : '-bottom-1.5'}
                        ${pos.includes('l') ? '-left-1.5' : '-right-1.5'}
                      `}
                    />
                  ))}
                </div>
              )}
            </div>
        </main>
      </div>

      {/* Filmstrip */}
      <footer className="flex-shrink-0 bg-slate-900/80 backdrop-blur-sm h-28 border-t border-slate-700 p-2">
        <div className="h-full flex items-center gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            {allPhotos.map(photo => (
                <button key={photo.id} onClick={() => handleNavigateFilmstrip(photo.id)} className={`h-24 w-24 flex-shrink-0 rounded-md overflow-hidden relative transition-all duration-200 ${photo.id === currentPhoto.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : 'ring-2 ring-transparent hover:ring-slate-500'}`}>
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover"/>
                    {photo.id !== currentPhoto.id && <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>}
                </button>
            ))}
        </div>
      </footer>
      
      {/* Unsaved Changes Modal */}
      {unsavedChangesModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-white">Unsaved Changes</h3>
            <p className="text-slate-400 mt-2 mb-6 text-sm">You have unsaved changes. What would you like to do?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUnsavedChangesModal({ isOpen: false })}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDiscardChanges();
                  if (unsavedChangesModal.onConfirm) unsavedChangesModal.onConfirm();
                }}
                className="px-4 py-2 text-sm font-semibold rounded-md text-red-400 hover:bg-red-900/50 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => handleSave(unsavedChangesModal.onConfirm)}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditView;
