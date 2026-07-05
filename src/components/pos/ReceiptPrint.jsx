"use client";

import React from "react";

const ReceiptPrint = React.forwardRef(({ invoice }, ref) => {
  if (!invoice) return <div style={{ display: 'none' }}><div ref={ref}></div></div>;

  return (
    <div style={{ display: 'none' }}>
      <div ref={ref} className="w-[80mm] p-2 bg-white text-black mx-auto" style={{ fontFamily: "monospace", fontSize: "12px", color: "#000" }}>
        
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold uppercase mb-1">Chayatol Resort</h2>
          <p className="text-xs">123 Resort Road, Sylhet, BD</p>
          <p className="text-xs">Phone: +880 1700 000000</p>
        </div>

        <div className="border-b border-dashed border-black mb-2 pb-2">
          <div className="flex justify-between text-xs">
            <span>Invoice: {invoice.invoiceNo}</span>
            <span>{new Date(invoice.createdAt || Date.now()).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>Type: {invoice.orderType || invoice.orderSource || "Dine In"}</span>
            <span>{new Date(invoice.createdAt || Date.now()).toLocaleTimeString()}</span>
          </div>
          {invoice.tableNo && <p className="text-xs mt-1">Table: {invoice.tableNo}</p>}
          {invoice.roomNo && <p className="text-xs mt-1">Room: {invoice.roomNo}</p>}
          {invoice.customer?.name && <p className="text-xs mt-1">Guest: {invoice.customer.name}</p>}
        </div>

        {/* Items */}
        <table className="w-full text-xs mb-2">
          <thead>
            <tr className="border-b border-dashed border-black">
              <th className="text-left pb-1">Item</th>
              <th className="text-center pb-1">Qty</th>
              <th className="text-right pb-1">Price</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.orderBatches?.reduce((acc, batch) => acc.concat(batch.items), []) || invoice.items || []).map((item, idx) => (
              <tr key={idx} className="align-top">
                <td className="py-1 pr-1">{item.itemName}</td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-right">{item.totalPrice?.toFixed(2) || "0.00"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-dashed border-black pt-2 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{invoice.subTotal.toFixed(2)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{invoice.discount.toFixed(2)}</span>
            </div>
          )}
          {invoice.vat > 0 && (
            <div className="flex justify-between">
              <span>VAT:</span>
              <span>{invoice.vat.toFixed(2)}</span>
            </div>
          )}
          {invoice.sd > 0 && (
            <div className="flex justify-between">
              <span>SD:</span>
              <span>{invoice.sd.toFixed(2)}</span>
            </div>
          )}
          {invoice.serviceCharge > 0 && (
            <div className="flex justify-between">
              <span>Service Chg:</span>
              <span>{invoice.serviceCharge.toFixed(2)}</span>
            </div>
          )}
          {invoice.deliveryCharge > 0 && (
            <div className="flex justify-between">
              <span>Delivery Chg:</span>
              <span>{invoice.deliveryCharge.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-bold text-sm mt-2 border-t border-dashed border-black pt-1">
            <span>TOTAL:</span>
            <span>{invoice.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-black pt-2 text-center text-xs">
          <p>Paid by: {invoice.paymentMethod}</p>
          <p className="mt-2 font-bold">THANK YOU!</p>
          <p>Please come again</p>
        </div>

      </div>
    </div>
  );
});

ReceiptPrint.displayName = 'ReceiptPrint';

export default ReceiptPrint;
