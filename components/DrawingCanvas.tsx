import React, { useRef, useEffect, useState } from 'react';
import { Eraser, RefreshCw } from 'lucide-react';

interface DrawingCanvasProps {
  letter: string;
  color: string;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ letter, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');

  // Draw the letter outline on mount/change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initial setup
    resetCanvas();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter]);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw large letter outline
    ctx.font = 'bold 250px "Tajawal", "Amiri", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#cbd5e1'; // Light gray outline
    ctx.strokeText(letter, canvas.width / 2, canvas.height / 2);
    
    // Save this state so the eraser doesn't wipe the guide (optional complex logic, for now simple layer)
    // Actually for simplicity in this demo, we just draw user input over it.
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if(canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = (e as React.MouseEvent).clientX - rect.left;
        y = (e as React.MouseEvent).clientY - rect.top;
    }

    ctx.lineWidth = mode === 'draw' ? 25 : 40;
    ctx.lineCap = 'round';
    ctx.strokeStyle = mode === 'draw' ? color : '#fefce8'; // Erase paints background color

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative border-4 border-dashed border-orange-300 rounded-3xl bg-yellow-50 shadow-inner touch-none overflow-hidden">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
        />
      </div>

      <div className="flex gap-4">
         <button
          onClick={() => setMode('draw')}
          className={`p-3 rounded-full transition-all ${mode === 'draw' ? 'bg-green-500 text-white scale-110 shadow-lg' : 'bg-white text-gray-400'}`}
        >
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color }}></div>
        </button>
        <button
          onClick={() => setMode('erase')}
          className={`p-3 rounded-full transition-all ${mode === 'erase' ? 'bg-red-500 text-white scale-110 shadow-lg' : 'bg-white text-gray-400'}`}
        >
          <Eraser size={24} />
        </button>
        <button
          onClick={resetCanvas}
          className="p-3 rounded-full bg-white text-blue-500 hover:bg-blue-50 transition-colors"
        >
          <RefreshCw size={24} />
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;