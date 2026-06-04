import React from 'react';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, itemName, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Deletion</h2>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <span className="font-semibold text-gray-800">"{itemName}"</span>? 
          This action cannot be undone.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 transition flex items-center"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;