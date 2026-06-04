import React from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
  if (totalPages <= 1 || totalItems === 0) return null;
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4">
      <div className="text-sm text-gray-700 dark:text-brand-sage">
        Showing {startItem} to {endItem} of {totalItems} entries
      </div>
      <nav>
        <ul className="flex items-center gap-1">
          <li>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-brand-white dark:bg-brand-dark-grey border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-s-lg hover:bg-brand-offwhite disabled:opacity-50 text-brand-charcoal dark:text-brand-offwhite"
              aria-label="Previous"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
          </li>
          {pageNumbers.map(number => (
            <li key={number}>
              <button
                onClick={() => onPageChange(number)}
                className={`px-3 py-1 border rounded hover:bg-brand-primary/10 transition ${
                  currentPage === number 
                    ? 'bg-brand-primary text-brand-white border-brand-primary font-semibold' 
                    : 'bg-brand-white dark:bg-brand-dark-grey border-brand-beige/50 dark:border-brand-dark-grey/50 text-brand-charcoal dark:text-brand-offwhite'
                }`}
              >
                {number}
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-brand-white dark:bg-brand-dark-grey border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-e-lg hover:bg-brand-offwhite disabled:opacity-50 text-brand-charcoal dark:text-brand-offwhite"
              aria-label="Next"
            >
              <HiChevronRight className="w-5 h-5" />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Pagination;