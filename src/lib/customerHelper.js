export const calculateCompleteness = (cust) => {
  if (!cust) return 0;
  let score = 0;
  
  // 1. Full Legal Name & Phone Number (1 mark)
  if (cust.fullName && cust.fullName.trim() !== "" && cust.phoneNumber && cust.phoneNumber.trim() !== "") {
    score += 1;
  }
  
  // 2. Email Address (1 mark)
  if (cust.emailAddress && cust.emailAddress.trim() !== "") {
    score += 1;
  }
  
  // 3. Date of Birth (1 mark)
  if (cust.dateOfBirth) {
    score += 1;
  }
  
  // 4. Anniversary Date (1 mark)
  if (cust.anniversaryDate) {
    score += 1;
  }
  
  // 5. Address (2 marks)
  const addr = cust.address;
  if (addr && (addr.line1?.trim() || addr.line2?.trim() || addr.city?.trim() || addr.division?.trim() || addr.country?.trim())) {
    score += 2;
  }
  
  // 6. Identification (2 marks)
  if (cust.identificationType && cust.identificationNumber && cust.identificationNumber.trim() !== "") {
    score += 2;
  }
  
  // 7. Emergency Contact Information (1 mark)
  const emergency = cust.emergencyContact;
  if (emergency && (emergency.name?.trim() || emergency.relation?.trim() || emergency.phoneNumber?.trim())) {
    score += 1;
  }
  
  // 8. Occupation (1 mark)
  if (cust.occupation && cust.occupation.trim() !== "") {
    score += 1;
  }
  
  return score;
};
