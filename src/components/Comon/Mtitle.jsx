import React from "react";

const Mtitle = ({ title, middlecontent, rightcontent }) => {
  return (
    <div className="flex flex-col md:flex-row md:justify-between items-center mb-5 gap-4">
      <h2 className="text-2xl font-bold text-brand-charcoal dark:text-brand-offwhite">{title}</h2>
      <div>
        {middlecontent}
      </div>
      <div>
        {rightcontent}
      </div>
    </div>
  );
};

export default Mtitle;
