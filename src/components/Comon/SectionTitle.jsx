import React from 'react';

const SectionTitle = ({
  title,
  subtitle,
  rightElement,
  onAction,
  actionText = "Action",
  actionLoadingText = "Processing...",
  isLoading = false
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">

      {/* Left Side: Typography upgraded to DaisyUI style */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[#147bff] text-2xl sm:text-3xl font-extrabold tracking-tight transition-colors m-0 leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[#181818]/70 dark:text-[#f2f2f2]/70 text-sm sm:text-base font-medium transition-colors m-0 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Side: Action Elements */}
      <div className="w-full md:w-auto flex items-center gap-3">
        {rightElement ? (
          rightElement
        ) : onAction ? (
          <button
            onClick={onAction}
            disabled={isLoading}
            // Styled to look like a DaisyUI `.btn .btn-primary .btn-outline` variant
            className="w-full md:w-auto px-5 py-2.5 bg-[#147bff]/10 hover:bg-[#147bff]/20 text-[#147bff] dark:bg-[#147bff]/20 dark:hover:bg-[#147bff]/30 rounded-lg text-sm font-semibold tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#147bff] border-b-transparent rounded-full animate-spin inline-block"></span>
                {actionLoadingText}
              </>
            ) : (
              actionText
            )}
          </button>
        ) : null}
      </div>

    </div>
  );
};

export default SectionTitle;