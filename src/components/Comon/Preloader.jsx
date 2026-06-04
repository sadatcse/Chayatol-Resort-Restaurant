import React from "react";

const Preloader = () => {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="relative flex flex-col items-center mt-10">
        <div className="w-16 h-16 border-4 border-brand-beige border-t-brand-primary rounded-full animate-spin shadow-lg"></div>
        <p className="mt-4 text-base font-semibold text-brand-dark-grey dark:text-brand-sage">Please Wait Loading Data...</p>
      </div>
    </div>
  );
};

export default Preloader;
