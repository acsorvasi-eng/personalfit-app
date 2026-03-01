import { useState, useRef, useEffect } from "react";
import { X, Save, ZoomIn, ZoomOut, Move } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (croppedImage: string) => void;
}

export function AvatarEditor({ isOpen, onClose, imageUrl, onSave }: AvatarEditorProps) {
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageUrl && imageRef.current) {
      imageRef.current.src = imageUrl;
    }
  }, [imageUrl]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to 200x200 for avatar
    canvas.width = 200;
    canvas.height = 200;

    // Clear canvas
    ctx.clearRect(0, 0, 200, 200);

    // Draw the image with current zoom and position
    const centerX = 100;
    const centerY = 100;
    const scaledWidth = image.width * zoom;
    const scaledHeight = image.height * zoom;

    ctx.drawImage(
      image,
      centerX + position.x - scaledWidth / 2,
      centerY + position.y - scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );

    // Get the cropped image as base64
    const croppedImage = canvas.toDataURL('image/jpeg', 0.9);
    onSave(croppedImage);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">{t("avatarEditor.title")}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Preview Area */}
          <div className="bg-gray-100 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-3 text-center">
              {t("avatarEditor.hint")}
            </p>
            
            <div 
              className="relative w-64 h-64 mx-auto bg-white rounded-2xl overflow-hidden border-4 border-blue-500 cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                alt="Avatar preview"
                className="absolute top-1/2 left-1/2 pointer-events-none select-none"
                style={{
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.1s'
                }}
              />
              
              {/* Circular guide */}
              <div className="absolute inset-0 pointer-events-none">
                <svg viewBox="0 0 256 256" className="w-full h-full">
                  <circle 
                    cx="128" 
                    cy="128" 
                    r="120" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeDasharray="5,5"
                    opacity="0.5"
                  />
                </svg>
              </div>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Move className="w-3 h-3" />
                {t("avatarEditor.dragImage")}
              </div>
            </div>

            {/* Hidden canvas for cropping */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Zoom Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("avatarEditor.zoom")}</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <ZoomOut className="w-5 h-5 text-gray-700" />
              </button>
              
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
              
              <span className="text-sm font-medium text-gray-700 min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          {/* Position Reset */}
          <button
            onClick={() => {
              setPosition({ x: 0, y: 0 });
              setZoom(1);
            }}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {t("avatarEditor.reset")}
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              {t("ui.cancel")}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:from-blue-600 hover:to-teal-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {t("profile.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}