import React, { useState, useRef, useEffect } from 'react';

const ModernDropdown = ({ options, value, onChange, placeholder = "Select an option" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full md:min-w-[240px]" ref={dropdownRef}>
      {/* Dropdown Header/Trigger */}
      <div
        className="flex items-center justify-between border border-gray-300 rounded-lg p-2.5 bg-white cursor-pointer hover:border-blue-500 transition-colors shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm truncate pr-4 ${value ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
          {value || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
          <ul className="py-1">
            {/* Default "All" option */}
            <li
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${!value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => { onChange(''); setIsOpen(false); }}
            >
              {placeholder}
            </li>
            
            {/* Manufacturer Options */}
            {options.map((opt) => (
              <li
                key={opt.id}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors border-t border-gray-50 ${
                  value === opt.name ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                }`}
                onClick={() => { onChange(opt.name); setIsOpen(false); }}
              >
                {opt.name}
              </li>
            ))}
            
            {/* Empty State */}
            {options.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400 text-center italic">
                Loading data...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ModernDropdown;