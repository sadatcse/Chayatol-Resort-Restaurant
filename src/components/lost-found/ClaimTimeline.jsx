import React from "react";
import { FiCheck, FiInfo, FiAlertCircle, FiSettings, FiUserCheck, FiGift } from "react-icons/fi";

const ClaimTimeline = ({ currentStatus }) => {
  const steps = [
    {
      key: "FOUND",
      title: "Item Found",
      desc: "Item has been logged by staff and is awaiting cataloging.",
      icon: <FiInfo size={16} />,
    },
    {
      key: "STORED",
      title: "Storage Assigned",
      desc: "Item has been placed in secure storage.",
      icon: <FiSettings size={16} />,
    },
    {
      key: "CLAIM_REQUESTED",
      title: "Claim Submitted",
      desc: "An ownership claim has been submitted by a guest.",
      icon: <FiAlertCircle size={16} />,
    },
    {
      key: "APPROVED",
      title: "Claim Approved",
      desc: "Ownership has been verified and approved.",
      icon: <FiUserCheck size={16} />,
    },
    {
      key: "RETURNED",
      title: "Returned to Owner",
      desc: "Item handed over and return note generated.",
      icon: <FiGift size={16} />,
    },
  ];

  const getStepIndex = (status) => {
    if (status === "FOUND") return 0;
    if (status === "STORED") return 1;
    if (status === "CLAIM_REQUESTED" || status === "UNDER_VERIFICATION") return 2;
    if (status === "APPROVED") return 3;
    if (status === "RETURNED") return 4;
    return -1; // For EXPIRED, DISPOSED, ARCHIVED
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="w-full py-4">
      <h4 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal dark:text-brand-offwhite mb-6">
        Item Lifecycle Timeline
      </h4>
      <div className="relative border-l-2 border-brand-beige dark:border-brand-dark-grey/50 ml-4 pl-8 space-y-8 text-left">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          const isUpcoming = idx > currentIndex;

          let iconBg = "bg-brand-offwhite text-brand-sage border-brand-beige";
          let textColor = "text-brand-sage";
          
          if (isCompleted) {
            iconBg = "bg-emerald-500 text-white border-emerald-500";
            textColor = "text-emerald-600 dark:text-emerald-400";
          } else if (isActive) {
            iconBg = "bg-brand-primary text-white border-brand-primary";
            textColor = "text-brand-primary dark:text-brand-sage font-bold";
          }

          // Handle special final status for unclaimed items (EXPIRED / DISPOSED / ARCHIVED)
          const isUnclaimedEnd = currentIndex === -1 && idx === 4;
          let unclaimedLabel = "";
          let unclaimedIcon = null;

          if (isUnclaimedEnd) {
            if (currentStatus === "EXPIRED") {
              unclaimedLabel = "Expired Unclaimed";
              unclaimedIcon = <FiAlertCircle size={16} />;
              iconBg = "bg-amber-500 text-white border-amber-500";
              textColor = "text-amber-500 font-bold";
            } else if (currentStatus === "DISPOSED") {
              unclaimedLabel = "Disposed / Recycled";
              unclaimedIcon = <FiXCircle size={16} />;
              iconBg = "bg-red-500 text-white border-red-500";
              textColor = "text-red-500 font-bold";
            } else if (currentStatus === "ARCHIVED") {
              unclaimedLabel = "Archived";
              unclaimedIcon = <FiInfo size={16} />;
              iconBg = "bg-slate-500 text-white border-slate-500";
              textColor = "text-slate-500 font-bold";
            }
          }

          return (
            <div key={idx} className="relative">
              {/* Timeline dot */}
              <span
                className={`absolute -left-[43px] top-0 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-300 ${iconBg}`}
              >
                {isCompleted ? <FiCheck size={14} /> : (isUnclaimedEnd ? unclaimedIcon : step.icon)}
              </span>
              <div>
                <h5 className={`text-sm font-semibold tracking-wide uppercase ${textColor}`}>
                  {isUnclaimedEnd ? unclaimedLabel : step.title}
                </h5>
                <p className="text-xs text-brand-sage dark:text-brand-offwhite/60 mt-1 max-w-md">
                  {isUnclaimedEnd ? `This item was not claimed within the retention window and was marked as ${currentStatus.toLowerCase()}.` : step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Help helper icon for unhandled statuses
const FiXCircle = ({ size, ...props }) => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    height={size}
    width={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

export default ClaimTimeline;
