"use client";

import React, { useState, useEffect } from 'react';

/**
 * Reusable component to generate, display, and download a QR code using a public API.
 * This avoids dependency compatibility issues with React 19.
 */
export default function QRCodeGenerator({ type, id }) {
    const [url, setUrl] = useState('');
    const [qrImageUrl, setQrImageUrl] = useState('');

    useEffect(() => {
        if (type && id) {
            const fullUrl = `${window.location.origin}/review/${type}/${id}`;
            setUrl(fullUrl);
            setQrImageUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}`);
        }
    }, [type, id]);

    const handleDownload = async () => {
        if (!qrImageUrl) return;
        try {
            const response = await fetch(qrImageUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = `qrcode-${type}-${id}.png`;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Failed to download QR code:", error);
            // Fallback opening in new tab
            window.open(qrImageUrl, '_blank');
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center w-full max-w-xs text-center border border-gray-150 transition-all duration-300 hover:shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4 capitalize">Review QR Code</h3>
            
            <div className="mb-4 w-48 h-48 flex items-center justify-center bg-white rounded-lg border border-gray-200 p-2">
                {qrImageUrl ? (
                    <img 
                        src={qrImageUrl} 
                        alt="QR Code" 
                        className="w-44 h-44 object-contain"
                    />
                ) : (
                    <p className="text-sm text-gray-500 px-4">Generating QR Code...</p>
                )}
            </div>
            
            <p className="text-sm font-medium text-gray-600">Scan to view details</p>
            
            <button
                onClick={handleDownload}
                disabled={!qrImageUrl}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download QR
            </button>
        </div>
    );
}
