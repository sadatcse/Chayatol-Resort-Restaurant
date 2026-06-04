import React from 'react';

const SectionHeader = ({ title, subtitle, children, className = "" }) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}>
      <div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-primary to-brand-secondary dark:from-brand-sage dark:to-brand-offwhite bg-clip-text text-transparent capitalize">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-brand-sage mt-1.5 font-medium">
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Optional right-side content (buttons, filters, etc.) */}
      {children && (
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {children}
        </div>
      )}
    </div>
  );
};

export default SectionHeader;
