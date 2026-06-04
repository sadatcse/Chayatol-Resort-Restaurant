import React from 'react';

const FilterDropdown = ({ label, options, value, onChange, placeholder = "All" }) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#181818]/50 dark:text-[#f2f2f2]/50 ml-1">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#181818]/5 dark:bg-[#f2f2f2]/5 border border-[#181818]/10 dark:border-[#f2f2f2]/10 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-[#147bff] transition-all cursor-pointer text-[#181818] dark:text-[#f2f2f2]"
      >
        <option value="">{placeholder} {label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FilterDropdown;