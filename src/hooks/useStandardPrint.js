"use client";

import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";

/**
 * Reusable React Hook for standardized, state-controlled printing.
 * Watches a data state variable and triggers print execution only after 
 * React updates the virtual DOM with the new state.
 *
 * @param {Object} options - react-to-print options (e.g. documentTitle, onBeforePrint)
 */
export default function useStandardPrint(options = {}) {
  const [printData, setPrintData] = useState(null);
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => {
      setPrintData(null);
      if (options.onAfterPrint) {
        options.onAfterPrint();
      }
    },
    ...options,
  });

  useEffect(() => {
    if (printData) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [printData, handlePrint]);

  return {
    printData,
    setPrintData,
    printRef,
    handlePrint,
  };
}
