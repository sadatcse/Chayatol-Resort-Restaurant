import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-offwhite dark:bg-brand-charcoal transition-colors duration-300">
      <div className="text-center p-6 bg-brand-white dark:bg-brand-dark-grey rounded-lg shadow-xl">
        <h1 className="text-6xl font-bold text-brand-bronze mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-brand-charcoal dark:text-brand-offwhite mb-2">Page Not Found</h2>
        <p className="text-lg text-brand-dark-grey dark:text-brand-sage mb-6">The page you are looking for does not exist or has been moved.</p>
        <Link href="/" className="inline-block bg-brand-primary text-brand-white py-2 px-6 rounded-lg shadow hover:bg-brand-secondary transition-colors duration-200">
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
