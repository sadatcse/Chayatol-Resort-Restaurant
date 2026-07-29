"use client";

import React from "react";
import { buildStayGuestRows } from "@/lib/guestCapacity";

// Print body for the Customer Profile Details report. Rendered as children
// of a page's own <PrintReportTemplate ref={...}> (each page keeps its own
// useStandardPrint hook/ref - only this inner markup is shared). Includes
// every guest on the stay (spouse/kids/companions), not just the primary
// guest, which the previous per-page copies of this print block omitted.
const CustomerProfilePrintable = ({ stay }) => {
  if (!stay || !stay.customer) return null;
  const customer = stay.customer;
  const guestRows = buildStayGuestRows(stay);

  return (
    <>
      <div style={{ display: "flex", gap: "30px", marginBottom: "30px", borderBottom: "1px solid #ccc", paddingBottom: "20px" }}>
        <div style={{ width: "120px" }}>
          {customer.customerPhoto ? (
            <img src={customer.customerPhoto} alt="Photo" style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "4px" }} />
          ) : (
            <div style={{ width: "120px", height: "120px", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "40px", backgroundColor: "#f3f4f6", color: "#6b7280" }}>
              {customer.fullName?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 30px", width: "100%", fontSize: "12px" }}>
          <div><strong>Full Name:</strong> {customer.fullName}</div>
          <div><strong>Phone Number:</strong> {customer.phoneNumber}</div>
          <div><strong>Email Address:</strong> {customer.emailAddress || "N/A"}</div>
          <div><strong>Nationality:</strong> {customer.nationality || "Bangladeshi"}</div>
          <div><strong>Gender / Marital Status:</strong> {customer.gender} / {customer.maritalStatus}</div>
          <div><strong>Date of Birth:</strong> {customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString("en-GB") : "N/A"}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "30px", fontSize: "12px" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>IDENTIFICATION</h4>
          <p style={{ margin: "5px 0" }}><strong>ID Type:</strong> {customer.identificationType || "N/A"}</p>
          <p style={{ margin: "5px 0" }}><strong>ID Number:</strong> {customer.identificationNumber || "N/A"}</p>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>OCCUPATION INFO</h4>
          <p style={{ margin: "5px 0" }}><strong>Occupation:</strong> {customer.occupation || "N/A"}</p>
          <p style={{ margin: "5px 0" }}><strong>Company Name:</strong> {customer.companyName || "N/A"}</p>
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px", marginBottom: "30px", fontSize: "12px" }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>RESIDENTIAL ADDRESS</h4>
        {customer.address ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <p style={{ margin: "0" }}><strong>Street:</strong> {customer.address.line1} {customer.address.line2 || ""}</p>
            <p style={{ margin: "0" }}><strong>City/Division/Country:</strong> {customer.address.city || "—"}, {customer.address.division || "—"}, {customer.address.country || "Bangladesh"}</p>
          </div>
        ) : (
          <p style={{ margin: "0", fontStyle: "italic" }}>No address provided.</p>
        )}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px", marginBottom: "30px", fontSize: "12px" }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>EMERGENCY CONTACT</h4>
        {customer.emergencyContact ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            <p style={{ margin: "0" }}><strong>Name:</strong> {customer.emergencyContact.name || "N/A"}</p>
            <p style={{ margin: "0" }}><strong>Relation:</strong> {customer.emergencyContact.relation || "N/A"}</p>
            <p style={{ margin: "0" }}><strong>Phone:</strong> {customer.emergencyContact.phoneNumber || "N/A"}</p>
          </div>
        ) : (
          <p style={{ margin: "0", fontStyle: "italic" }}>No emergency contact details provided.</p>
        )}
      </div>

      {guestRows.length > 0 && (
        <div style={{ marginBottom: "10px", fontSize: "12px" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>
            GUESTS STAYING (Primary + Accompanying Guests)
          </h4>
          <table className="print-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Guest Name</th>
                <th>Relation</th>
                <th>Phone</th>
                <th>ID Type / Number</th>
              </tr>
            </thead>
            <tbody>
              {guestRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.roomLabel}</td>
                  <td style={{ fontWeight: "bold" }}>{row.fullName}{row.isPrimary ? " (Primary)" : ""}</td>
                  <td>{row.isPrimary ? "Self" : (row.relationToPrimary || "N/A")}</td>
                  <td>{row.phoneNumber || "N/A"}</td>
                  <td>{row.identificationType ? `${row.identificationType} - ${row.identificationNumber || "N/A"}` : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default CustomerProfilePrintable;
