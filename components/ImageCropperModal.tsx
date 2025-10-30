import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader } from './Loader';

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
};

interface ImageCropperModalProps {
  file: File;
  onCrop: (croppedDataUrl: string) => void;
  onClose: () => void;
  aspectRatio?: number;
}

type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ file, onCrop, onClose, aspectRatio = 1 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
    
    // Refs to hold state for window event listeners to avoid stale closures
    const cropRef = useRef(crop);
    const isResizingRef = useRef<ResizeHandle | null>(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });
    
    useEffect(() => {
        cropRef.current = crop;
    }, [crop]);
    
    const mouseDownTarget = useRef<EventTarget | null>(null);


    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const image = imageRef.current;
        const currentCrop = cropRef.current;

        if (!canvas || !ctx || !image) return;

        const { naturalWidth, naturalHeight } = image;
        const containerWidth = Math.min(window.innerWidth * 0.8, 500);
        const scale = containerWidth / naturalWidth;
        canvas.width = containerWidth;
        canvas.height = naturalHeight * scale;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(currentCrop.x, currentCrop.y, currentCrop.width, currentCrop.height);
        ctx.clip();
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(currentCrop.x, currentCrop.y, currentCrop.width, currentCrop.height);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const handleSize = 8;
        const halfHandle = handleSize / 2;
        
        // Corners
        ctx.fillRect(currentCrop.x - halfHandle, currentCrop.y - halfHandle, handleSize, handleSize); // tl
        ctx.fillRect(currentCrop.x + currentCrop.width - halfHandle, currentCrop.y - halfHandle, handleSize, handleSize); // tr
        ctx.fillRect(currentCrop.x - halfHandle, currentCrop.y + currentCrop.height - halfHandle, handleSize, handleSize); // bl
        ctx.fillRect(currentCrop.x + currentCrop.width - halfHandle, currentCrop.y + currentCrop.height - halfHandle, handleSize, handleSize); // br
        
        // Edges
        ctx.fillRect(currentCrop.x + currentCrop.width / 2 - halfHandle, currentCrop.y - halfHandle, handleSize, handleSize); // t
        ctx.fillRect(currentCrop.x + currentCrop.width / 2 - halfHandle, currentCrop.y + currentCrop.height - halfHandle, handleSize, handleSize); // b
        ctx.fillRect(currentCrop.x - halfHandle, currentCrop.y + currentCrop.height / 2 - halfHandle, handleSize, handleSize); // l
        ctx.fillRect(currentCrop.x + currentCrop.width - halfHandle, currentCrop.y + currentCrop.height / 2 - halfHandle, handleSize, handleSize); // r
    }, []);

    useEffect(() => {
        fileToDataUrl(file).then(url => {
            const img = new Image();
            img.onload = () => {
                imageRef.current = img;
                const { naturalWidth, naturalHeight } = img;
                const containerWidth = Math.min(window.innerWidth * 0.8, 500);
                const scale = containerWidth / naturalWidth;
                const canvasWidth = containerWidth;
                const canvasHeight = naturalHeight * scale;
                
                let initialWidth, initialHeight, initialX, initialY;

                if (canvasWidth / canvasHeight > aspectRatio) {
                    initialHeight = canvasHeight;
                    initialWidth = initialHeight * aspectRatio;
                    initialX = (canvasWidth - initialWidth) / 2;
                    initialY = 0;
                } else {
                    initialWidth = canvasWidth;
                    initialHeight = initialWidth / aspectRatio;
                    initialX = 0;
                    initialY = (canvasHeight - initialHeight) / 2;
                }
                
                setCrop({ x: initialX, y: initialY, width: initialWidth, height: initialHeight });
            };
            img.src = url;
            setImageDataUrl(url);
        });
    }, [file, aspectRatio]);

    useEffect(() => {
        draw();
    }, [crop, draw]);

    const getHandleAtPosition = (x: number, y: number): ResizeHandle | null => {
        const handleSize = 12; // Larger hit area
        const { x: cx, y: cy, width: cw, height: ch } = cropRef.current;
        if (x > cx - handleSize && x < cx + handleSize && y > cy - handleSize && y < cy + handleSize) return 'tl';
        if (x > cx + cw - handleSize && x < cx + cw + handleSize && y > cy - handleSize && y < cy + handleSize) return 'tr';
        if (x > cx - handleSize && x < cx + handleSize && y > cy + ch - handleSize && y < cy + ch + handleSize) return 'bl';
        if (x > cx + cw - handleSize && x < cx + cw + handleSize && y > cy + ch - handleSize && y < cy + ch + handleSize) return 'br';
        if (x > cx + handleSize && x < cx + cw - handleSize && y > cy - handleSize && y < cy + handleSize) return 't';
        if (x > cx + handleSize && x < cx + cw - handleSize && y > cy + ch - handleSize && y < cy + ch + handleSize) return 'b';
        if (x > cx - handleSize && x < cx + handleSize && y > cy + handleSize && y < cy + ch - handleSize) return 'l';
        if (x > cx + cw - handleSize && x < cx + cw + handleSize && y > cy + handleSize && y < cy + ch - handleSize) return 'r';
        return null;
    }

    const handleWindowMouseMove = useCallback((e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const dx = mouseX - dragStartRef.current.x;
        const dy = mouseY - dragStartRef.current.y;
        
        if (isResizingRef.current) {
            let newCrop = { ...cropRef.current };
            const { cropX, cropY, cropW, cropH } = dragStartRef.current;
            const minSize = 20;

            switch (isResizingRef.current) {
                case 'tl':
                    newCrop.width = Math.max(minSize, cropW - dx);
                    newCrop.height = newCrop.width / aspectRatio;
                    newCrop.x = cropX + dx;
                    newCrop.y = cropY + (cropH - newCrop.height);
                    break;
                case 'tr':
                    newCrop.width = Math.max(minSize, cropW + dx);
                    newCrop.height = newCrop.width / aspectRatio;
                    newCrop.y = cropY + (cropH - newCrop.height);
                    break;
                case 'bl':
                    newCrop.width = Math.max(minSize, cropW - dx);
                    newCrop.height = newCrop.width / aspectRatio;
                    newCrop.x = cropX + dx;
                    break;
                case 'br':
                    newCrop.width = Math.max(minSize, cropW + dx);
                    newCrop.height = newCrop.width / aspectRatio;
                    break;
                case 't': {
                    const newHeight = Math.max(minSize, cropH - dy);
                    const newWidth = newHeight * aspectRatio;
                    newCrop.y = cropY + dy;
                    newCrop.x = cropX + (cropW - newWidth) / 2;
                    newCrop.width = newWidth;
                    newCrop.height = newHeight;
                    break;
                }
                case 'b': {
                    const newHeight = Math.max(minSize, cropH + dy);
                    const newWidth = newHeight * aspectRatio;
                    newCrop.x = cropX + (cropW - newWidth) / 2;
                    newCrop.width = newWidth;
                    newCrop.height = newHeight;
                    break;
                }
                case 'l': {
                    const newWidth = Math.max(minSize, cropW - dx);
                    const newHeight = newWidth / aspectRatio;
                    newCrop.x = cropX + dx;
                    newCrop.y = cropY + (cropH - newHeight) / 2;
                    newCrop.width = newWidth;
                    newCrop.height = newHeight;
                    break;
                }
                case 'r': {
                    const newWidth = Math.max(minSize, cropW + dx);
                    const newHeight = newWidth / aspectRatio;
                    newCrop.y = cropY + (cropH - newHeight) / 2;
                    newCrop.width = newWidth;
                    newCrop.height = newHeight;
                    break;
                }
            }
             setCrop(newCrop);
        } else if (isDraggingRef.current) {
            let newX = dragStartRef.current.cropX + dx;
            let newY = dragStartRef.current.cropY + dy;
            newX = Math.max(0, Math.min(newX, canvas.width - cropRef.current.width));
            newY = Math.max(0, Math.min(newY, canvas.height - cropRef.current.height));
            setCrop(c => ({ ...c, x: newX, y: newY }));
        }
    }, [aspectRatio]);

    const handleWindowMouseUp = useCallback(() => {
        isDraggingRef.current = false;
        isResizingRef.current = null;
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
    }, [handleWindowMouseMove]);

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const handle = getHandleAtPosition(x, y);

        dragStartRef.current = { x, y, cropX: crop.x, cropY: crop.y, cropW: crop.width, cropH: crop.height };

        if (handle) {
            isResizingRef.current = handle;
        } else if (x > crop.x && x < crop.x + crop.width && y > crop.y && y < crop.y + crop.height) {
            isDraggingRef.current = true;
        }
        
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
    };
    
    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isDraggingRef.current || isResizingRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const handle = getHandleAtPosition(mouseX, mouseY);
        if (handle) {
            if (['tl', 'br'].includes(handle)) canvas.style.cursor = 'nwse-resize';
            else if (['tr', 'bl'].includes(handle)) canvas.style.cursor = 'nesw-resize';
            else if (['t', 'b'].includes(handle)) canvas.style.cursor = 'ns-resize';
            else if (['l', 'r'].includes(handle)) canvas.style.cursor = 'ew-resize';
        } else if (mouseX > crop.x && mouseX < crop.x + crop.width && mouseY > crop.y && mouseY < crop.y + crop.height) {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'default';
        }
    };
    
    const handleCanvasMouseLeave = () => {
        if (canvasRef.current && !isDraggingRef.current && !isResizingRef.current) {
            canvasRef.current.style.cursor = 'default';
        }
    }

    const handleCrop = () => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return;

        const scaleX = image.naturalWidth / canvas.width;
        const scaleY = image.naturalHeight / canvas.height;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if(!tempCtx) return;

        tempCanvas.width = crop.width * scaleX;
        tempCanvas.height = crop.height * scaleY;

        tempCtx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            tempCanvas.width,
            tempCanvas.height
        );
        onCrop(tempCanvas.toDataURL(file.type));
    };
    
    const handleOverlayMouseDown = (e: React.MouseEvent) => {
        mouseDownTarget.current = e.target;
    };

    const handleOverlayMouseUp = (e: React.MouseEvent) => {
        if (mouseDownTarget.current === e.target && e.currentTarget === e.target) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" 
            onMouseDown={handleOverlayMouseDown}
            onMouseUp={handleOverlayMouseUp}
        >
            <div className="bg-panel rounded-lg p-6 w-full max-w-lg shadow-2xl">
                <h3 className="text-xl font-bold mb-4 text-text-primary">Crop Image</h3>
                <div className="flex justify-center items-center bg-bg-secondary rounded-md overflow-hidden">
                    {!imageDataUrl ? <Loader text="Loading Image..."/> :
                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseLeave={handleCanvasMouseLeave}
                            style={{ maxWidth: '100%', maxHeight: '60vh', cursor: 'grab' }}
                        />
                    }
                </div>
                 <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-bg-secondary hover:bg-border-color text-text-primary font-bold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleCrop} className="bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-2 px-4 rounded-md transition-colors">
                        Crop & Continue
                    </button>
                 </div>
            </div>
        </div>
    );
};
