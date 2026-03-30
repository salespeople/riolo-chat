
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RefreshCw, X, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';


interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.2;


export default function ImageModal({
  isOpen,
  onClose,
  imageUrl,
}: ImageModalProps) {

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleReset = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen, handleReset]);

  const handleZoom = (newZoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));
    setZoom(clampedZoom);
    if (clampedZoom <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && zoom > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const newZoom = zoom - e.deltaY * 0.001;
    handleZoom(newZoom);
  };


  if (!imageUrl) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="p-0 border-0 shadow-none bg-transparent max-w-none w-screen h-screen"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Anteprima Immagine Ingrandita</DialogTitle>
        <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white/80 transition-opacity hover:text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Chiudi"
          >
            <X className="h-6 w-6" />
        </button>

        <div 
          ref={imageContainerRef}
          className="relative w-full h-full overflow-hidden"
          onWheel={handleWheel}
        >
          <div 
            className={cn(
                "absolute inset-0 flex items-center justify-center transition-transform duration-300",
                isPanning ? 'cursor-grabbing' : (zoom > 1 ? 'cursor-grab' : 'cursor-default')
            )}
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          >
              <Image
                src={imageUrl}
                alt="Anteprima immagine ingrandita"
                width={1920}
                height={1080}
                className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain select-none pointer-events-none"
              />
          </div>
        </div>
        
        {/* Toolbar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-lg">
            <Button variant="ghost" size="icon" onClick={() => handleZoom(zoom + ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}>
                <ZoomIn className="h-5 w-5" />
            </Button>
             <span className="text-sm font-semibold w-12 text-center tabular-nums">
                {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="icon" onClick={() => handleZoom(zoom - ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}>
                <ZoomOut className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRotate}>
                <RotateCw className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReset}>
                <RefreshCw className="h-5 w-5" />
            </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
