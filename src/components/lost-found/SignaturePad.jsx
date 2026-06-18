import React, { useRef, useState, useEffect } from "react";
import { FiX, FiCheck } from "react-icons/fi";

const SignaturePad = ({ label = "Signature", onSave }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Adjust canvas resolution for high-DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1E293B"; // slate-800
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Handle resize
    const handleResize = () => {
      const tempImage = canvas.toDataURL();
      const newRect = canvas.getBoundingClientRect();
      canvas.width = newRect.width;
      canvas.height = newRect.height;
      
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = tempImage;
      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Support touch devices
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (onSave) onSave("");
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const signatureData = canvas.toDataURL("image/png");
    if (onSave) onSave(signatureData);
  };

  return (
    <div className="w-full space-y-2">
      <span className="block text-xs font-bold text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">
        {label}
      </span>
      <div className="border border-brand-beige dark:border-brand-dark-grey/50 rounded-2xl bg-white p-2 flex flex-col space-y-2 shadow-sm">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-36 bg-slate-50 dark:bg-slate-900/10 rounded-xl cursor-crosshair border border-dashed border-slate-200 touch-none"
        />
        <div className="flex justify-between items-center text-xs">
          <button
            type="button"
            onClick={clearCanvas}
            className="btn btn-xs btn-outline btn-error rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <FiX size={12} /> Clear
          </button>
          <button
            type="button"
            disabled={!hasDrawn}
            onClick={saveSignature}
            className="btn btn-xs btn-primary rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <FiCheck size={12} /> Save Signature
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;
