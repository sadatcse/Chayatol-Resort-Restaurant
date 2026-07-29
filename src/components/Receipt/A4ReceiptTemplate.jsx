"use client";

import React, { forwardRef, useImperativeHandle, useRef, useCallback } from "react";

const A4ReceiptTemplate = forwardRef(({ profileData, invoiceData, onPrintComplete }, ref) => {
    const internalPrintRef = useRef();

    const getCurrentDateTime = () => {
        const options = {
            day: "2-digit", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false,
        };
        return new Date().toLocaleString("en-GB", options);
    };

    const printReceipt = useCallback(() => {
        const node = internalPrintRef.current;
        if (!node) return;

        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.top = "-10000px";
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(`
            <html>
                <head>
                    <title>Invoice - ${invoiceData?.invoiceSerial || invoiceData?.invoiceNo || "Receipt"}</title>
                    <style>
                        * {
                            color: #000 !important;
                            box-sizing: border-box;
                        }
                        @media print {
                            @page { 
                                size: A4; 
                                margin: 15mm; 
                            }
                            body { 
                                margin: 0; 
                                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                                font-size: 14px;
                                line-height: 1.5;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .invoice-container {
                                width: 100%;
                                max-width: 100%;
                                padding: 0 !important;
                                margin: 0 !important;
                            }
                        }
                        body {
                            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                            font-size: 14px;
                            line-height: 1.5;
                            padding: 20px;
                        }
                        .invoice-container {
                            width: 210mm;
                            margin: 0 auto;
                            padding: 20px;
                            background: #fff;
                        }
                        .header-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 30px;
                        }
                        .header-table td {
                            vertical-align: top;
                        }
                        .company-info {
                            text-align: left;
                        }
                        .invoice-title {
                            text-align: right;
                        }
                        .invoice-title h1 {
                            margin: 0 0 5px 0;
                            font-size: 28px;
                            font-weight: 800;
                            letter-spacing: -0.5px;
                            text-transform: uppercase;
                        }
                        .details-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 30px;
                        }
                        .details-table td {
                            width: 50%;
                            vertical-align: top;
                        }
                        .bill-to-box {
                            border: 1px solid #e4e4e7;
                            padding: 15px;
                            border-radius: 8px;
                            background-color: #fafafa;
                            min-height: 120px;
                        }
                        .bill-to-box h3 {
                            margin: 0 0 8px 0;
                            font-size: 13px;
                            font-weight: 800;
                            text-transform: uppercase;
                            color: #71717a !important;
                        }
                        .invoice-meta-box {
                            border: 1px solid #e4e4e7;
                            padding: 15px;
                            border-radius: 8px;
                            background-color: #fafafa;
                            min-height: 120px;
                            margin-left: 15px;
                        }
                        .meta-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 6px;
                            font-size: 13px;
                        }
                        .meta-label {
                            color: #71717a !important;
                            font-weight: 600;
                        }
                        .meta-value {
                            font-weight: bold;
                            text-align: right;
                        }
                        .items-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 30px;
                        }
                        .items-table th {
                            background-color: #000;
                            color: #fff !important;
                            font-weight: bold;
                            text-transform: uppercase;
                            font-size: 12px;
                            padding: 12px 15px;
                            text-align: left;
                        }
                        .items-table th.text-right {
                            text-align: right;
                        }
                        .items-table td {
                            padding: 12px 15px;
                            border-bottom: 1px solid #e4e4e7;
                            font-size: 13px;
                        }
                        .items-table td.text-right {
                            text-align: right;
                        }
                        .summary-table-container {
                            display: flex;
                            justify-content: flex-end;
                            margin-bottom: 40px;
                        }
                        .summary-table {
                            width: 300px;
                            border-collapse: collapse;
                        }
                        .summary-table td {
                            padding: 8px 12px;
                            font-size: 13px;
                        }
                        .summary-table td.text-right {
                            text-align: right;
                            font-weight: bold;
                        }
                        .summary-label {
                            color: #71717a !important;
                            font-weight: 600;
                        }
                        .grand-total-row {
                            background-color: #fafafa;
                            border-top: 2px solid #000;
                            border-bottom: 2px solid #000;
                        }
                        .grand-total-row td {
                            padding: 12px;
                            font-size: 16px;
                            font-weight: bold;
                        }
                        .footer {
                            text-align: center;
                            border-top: 1px solid #e4e4e7;
                            padding-top: 20px;
                            margin-top: 50px;
                            font-size: 12px;
                            color: #71717a !important;
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 11px;
                            font-weight: 800;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .status-paid {
                            background-color: #d1fae5;
                            color: #065f46 !important;
                        }
                        .status-unpaid {
                            background-color: #fee2e2;
                            color: #991b1b !important;
                        }
                    </style>
                </head>
                <body>
                    <div class="invoice-container">
                        ${node.innerHTML}
                    </div>
                </body>
            </html>
        `);
        doc.close();

        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        setTimeout(() => {
            document.body.removeChild(iframe);
            if (onPrintComplete) onPrintComplete();
        }, 500);
    }, [invoiceData, onPrintComplete]);

    useImperativeHandle(ref, () => ({
        printReceipt,
    }));

    if (!invoiceData) return null;

    const isPaid = invoiceData.paymentStatus === 'Paid' || invoiceData.paymentMethod !== 'Due';

    // Extract items helper
    const items = Array.isArray(invoiceData?.products) && invoiceData.products.length > 0 
        ? invoiceData.products.map(p => ({
            itemName: p.productName,
            quantity: p.qty,
            unitPrice: p.rate,
            totalPrice: p.isComplimentary ? 0 : p.subtotal
          }))
        : Array.isArray(invoiceData?.orderBatches) && invoiceData.orderBatches.length > 0
            ? invoiceData.orderBatches.flatMap(b => b.items || [])
            : invoiceData?.items || [];

    return (
        <div ref={internalPrintRef} style={{ display: "none" }}>
            <div className="invoice-container">
                {/* Header Section */}
                <table className="header-table">
                    <tbody>
                        <tr>
                            <td className="company-info">
                                <h2 style={{ margin: "0 0 5px 0", fontSize: "24px", fontWeight: "800", textTransform: "uppercase" }}>
                                    {profileData?.name || "Chayatol Resort & Restaurant"}
                                </h2>
                                <p style={{ margin: "0 0 3px 0", fontSize: "13px", color: "#52525b" }}>
                                    {profileData?.address || "123 Resort Road, Sylhet, Bangladesh"}
                                </p>
                                <p style={{ margin: "0 0 3px 0", fontSize: "13px", color: "#52525b" }}>
                                    Phone: {profileData?.phone || "+880 1700 000000"} | Bin: {profileData?.binNumber || "N/A"}
                                </p>
                                {profileData?.website && (
                                    <p style={{ margin: "0", fontSize: "13px", color: "#52525b" }}>
                                        {profileData.website}
                                    </p>
                                )}
                            </td>
                            <td className="invoice-title">
                                <h1>INVOICE</h1>
                                <span className={`status-badge ${isPaid ? 'status-paid' : 'status-unpaid'}`}>
                                    {isPaid ? 'PAID' : 'DUE / UNPAID'}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Details Section */}
                <table className="details-table">
                    <tbody>
                        <tr>
                            <td>
                                <div className="bill-to-box">
                                    <h3>BILL TO</h3>
                                    <p style={{ margin: "0 0 4px 0", fontWeight: "bold", fontSize: "14px" }}>
                                        {invoiceData?.customerName || invoiceData?.customer?.name || "Walk-in Guest"}
                                    </p>
                                    {(invoiceData?.customerMobile || invoiceData?.customer?.phone) && (
                                        <p style={{ margin: "0 0 4px 0", color: "#52525b" }}>
                                            Phone: {invoiceData.customerMobile || invoiceData.customer.phone}
                                        </p>
                                    )}
                                    {invoiceData?.customer?.address && (
                                        <p style={{ margin: "0", color: "#52525b" }}>
                                            Address: {invoiceData.customer.address}
                                        </p>
                                    )}
                                </div>
                            </td>
                            <td>
                                <div className="invoice-meta-box">
                                    <div className="meta-row">
                                        <span className="meta-label">Invoice Serial</span>
                                        <span className="meta-value">{invoiceData?.invoiceSerial || invoiceData?.invoiceNo || "N/A"}</span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-label">Date & Time</span>
                                        <span className="meta-value">
                                            {new Date(invoiceData?.dateTime || invoiceData?.createdAt || Date.now()).toLocaleString("en-GB")}
                                        </span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-label">Order Source</span>
                                        <span className="meta-value">{invoiceData?.orderType || "N/A"}</span>
                                    </div>
                                    {invoiceData?.tableName && (
                                        <div className="meta-row">
                                            <span className="meta-label">Table</span>
                                            <span className="meta-value">{invoiceData.tableName || invoiceData.tableNo}</span>
                                        </div>
                                    )}
                                    {invoiceData?.roomNo && (
                                        <div className="meta-row">
                                            <span className="meta-label">Room No</span>
                                            <span className="meta-value">{invoiceData.roomNo}</span>
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Items Table */}
                <table className="items-table">
                    <thead>
                        <tr>
                            <th style={{ width: "5%" }}>Sl</th>
                            <th style={{ width: "55%" }}>Item Description</th>
                            <th style={{ width: "10%", textAlign: "right" }}>Qty</th>
                            <th style={{ width: "15%", textAlign: "right" }}>Rate</th>
                            <th style={{ width: "15%", textAlign: "right" }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? (
                            items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{idx + 1}</td>
                                    <td style={{ fontWeight: "bold" }}>{item.itemName || "N/A"}</td>
                                    <td className="text-right">{item.quantity || 0}</td>
                                    <td className="text-right">৳ {(item.unitPrice || 0).toFixed(1)}</td>
                                    <td className="text-right">৳ {(item.totalPrice || 0).toFixed(1)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center", color: "#a1a1aa" }}>No items billed on this invoice.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Summary Calculations */}
                <div className="summary-table-container">
                    <table className="summary-table">
                        <tbody>
                            <tr>
                                <td className="summary-label">Subtotal</td>
                                <td className="text-right">৳ {(invoiceData.subtotal || invoiceData.subTotal || 0).toFixed(1)}</td>
                            </tr>
                            {invoiceData.discount > 0 && (
                                <tr>
                                    <td className="summary-label">Discount</td>
                                    <td className="text-right" style={{ color: "#059669" }}>- ৳ {invoiceData.discount.toFixed(1)}</td>
                                </tr>
                            )}
                            {invoiceData.vat > 0 && (
                                <tr>
                                    <td className="summary-label">VAT</td>
                                    <td className="text-right">+ ৳ {invoiceData.vat.toFixed(1)}</td>
                                </tr>
                            )}
                            {invoiceData.sd > 0 && (
                                <tr>
                                    <td className="summary-label">SD</td>
                                    <td className="text-right">+ ৳ {invoiceData.sd.toFixed(1)}</td>
                                </tr>
                            )}
                            {invoiceData.serviceCharge > 0 && (
                                <tr>
                                    <td className="summary-label">Service Charge</td>
                                    <td className="text-right">+ ৳ {invoiceData.serviceCharge.toFixed(1)}</td>
                                </tr>
                            )}
                            {invoiceData.deliveryCharge > 0 && (
                                <tr>
                                    <td className="summary-label">Delivery Charge</td>
                                    <td className="text-right">+ ৳ {invoiceData.deliveryCharge.toFixed(1)}</td>
                                </tr>
                            )}
                            <tr className="grand-total-row">
                                <td style={{ fontWeight: "800" }}>GRAND TOTAL</td>
                                <td className="text-right" style={{ fontSize: "16px", fontWeight: "800" }}>
                                    ৳ {(invoiceData.totalAmount || invoiceData.grandTotal || 0).toFixed(1)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Section */}
                <div className="footer">
                    {Array.isArray(invoiceData?.payments) && invoiceData.payments.length > 1 ? (
                        <div style={{ margin: "0 0 5px 0" }}>
                            <p style={{ fontWeight: "bold", margin: "0 0 3px 0" }}>Payments:</p>
                            {invoiceData.payments.map((p, idx) => (
                                <p key={idx} style={{ margin: "0 0 2px 0" }}>
                                    {p.paymentType}: ৳ {(p.amount || 0).toFixed(1)}{p.transactionRef ? ` (Ref: ${p.transactionRef})` : ""}
                                </p>
                            ))}
                        </div>
                    ) : (
                        <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Payment Method: {invoiceData?.paymentMethod || "Cash"}</p>
                    )}
                    <p style={{ margin: "0 0 5px 0" }}>Thank you for visiting Chayatol Resort & Restaurant. We hope to see you again!</p>
                    <p style={{ margin: "0", fontSize: "10px", color: "#a1a1aa" }}>Printed on {getCurrentDateTime()}</p>
                </div>
            </div>
        </div>
    );
});

A4ReceiptTemplate.displayName = "A4ReceiptTemplate";
export default A4ReceiptTemplate;
