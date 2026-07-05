"use client";

import React, { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from "react";

const KitchenReceiptTemplate = forwardRef(({ profileData, invoiceData, kitchenName, onPrintComplete }, ref) => {
    const internalPrintRef = useRef();

    const getCurrentDateTime = () => {
        return new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    };

    const printReceipt = useCallback(() => {
        const node = internalPrintRef.current;
        if (!node) return;

        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.top = "-10000px";
        iframe.style.left = "-10000px";
        iframe.style.width = "0";
        iframe.style.height = "0";
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) { document.body.removeChild(iframe); return; }

        doc.open();
        doc.write(`
            <html>
                <head>
                    <title>KOT</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; font-weight: bold; color: #000; }
                        @media print {
                            @page { margin: 2mm; size: 72mm auto; }
                        }
                        body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; }
                        td, th { padding: 3px 0; vertical-align: top; }
                    </style>
                </head>
                <body>${node.outerHTML}</body>
            </html>
        `);
        doc.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
            if (onPrintComplete) onPrintComplete();
        }, 500);
    }, [onPrintComplete]);

    useImperativeHandle(ref, () => ({ printReceipt }));

    // Auto-trigger print as soon as invoiceData is available
    useEffect(() => {
        if (!invoiceData) return;
        // Small delay only to ensure the DOM ref is fully mounted
        const timer = setTimeout(() => printReceipt(), 150);
        return () => clearTimeout(timer);
    }, [invoiceData, printReceipt]);

    if (!invoiceData) return null;

    const kitchen  = (kitchenName || invoiceData?.kitchenName || "MAIN KITCHEN").toUpperCase();
    const kotRound = invoiceData?.kotRound || 1;
    const products = invoiceData?.products || [];
    const company  = profileData?.name || "Restaurant";

    const S = {
        wrap:        { fontFamily: "Arial, Helvetica, sans-serif", width: "72mm", margin: "0 auto", padding: "8px 10px", fontSize: "13px", color: "#000", background: "#fff" },
        center:      { textAlign: "center" },
        compName:    { fontSize: "18px", fontWeight: "bold", textAlign: "center", marginBottom: "4px" },
        kitchenBox:  { display: "inline-block", border: "3px solid #000", padding: "3px 10px", fontSize: "14px", fontWeight: "bold", letterSpacing: "1px" },
        kitchenName: { textAlign: "center", fontSize: "17px", fontWeight: "bold", marginTop: "4px", marginBottom: "2px", letterSpacing: "1px", borderBottom: "3px solid #000", paddingBottom: "4px" },
        dash:        { borderTop: "2px dashed #000", margin: "6px 0" },
        solid:       { borderTop: "2px solid #000", margin: "6px 0" },
        info:        { fontSize: "12px", margin: "2px 0" },
        tableNum:    { fontSize: "20px", fontWeight: "bold", margin: "2px 0" },
        thCell:      { textAlign: "left", padding: "3px 0", borderBottom: "1px dashed #000", fontSize: "12px" },
        qty:         { fontSize: "20px", fontWeight: "bold", width: "32px", verticalAlign: "top", paddingTop: "2px" },
        name:        { fontSize: "14px", fontWeight: "bold", verticalAlign: "top", paddingTop: "4px" },
        footer:      { textAlign: "center", marginTop: "8px", fontSize: "12px" },
    };

    return (
        <div ref={internalPrintRef} style={S.wrap}>
            {/* Company */}
            <div style={S.compName}>{company}</div>

            {/* KITCHEN TICKET label */}
            <div style={S.center}>
                <span style={S.kitchenBox}>KITCHEN TICKET</span>
            </div>

            {/* Kitchen name — always shown prominently */}
            <div style={S.kitchenName}>{kitchen}</div>

            <div style={S.dash} />

            {/* Order info */}
            <div style={S.info}><strong>Ticket #:</strong> {invoiceData?.invoiceSerial || invoiceData?.invoiceNo || "N/A"}</div>
            <div style={S.info}><strong>Date:</strong> {getCurrentDateTime()}</div>
            <div style={S.info}><strong>KOT Round:</strong> #{kotRound}</div>

            {invoiceData?.orderType === "dine-in" && (invoiceData?.tableName || invoiceData?.tableNo) && (
                <div style={S.tableNum}>Table: {invoiceData.tableName || invoiceData.tableNo}</div>
            )}
            {invoiceData?.orderType === "room service" && invoiceData?.roomNo && (
                <div style={S.tableNum}>Room: {invoiceData.roomNo}</div>
            )}
            {invoiceData?.orderType === "delivery" && invoiceData?.deliveryProvider && (
                <div style={S.info}><strong>Delivery:</strong> {invoiceData.deliveryProvider}</div>
            )}
            <div style={S.info}><strong>Type:</strong> {(invoiceData?.orderType || "").toUpperCase()}</div>

            <div style={S.dash} />

            {/* Items */}
            <table>
                <thead>
                    <tr>
                        <th style={{ ...S.thCell, width: "32px" }}>Qty</th>
                        <th style={S.thCell}>Item Name</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((item, i) => (
                        <tr key={i}>
                            <td style={S.qty}>{item.qty || item.quantity || 0}</td>
                            <td style={S.name}>{item.productName || "Unknown"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={S.dash} />

            {/* Footer */}
            <div style={S.footer}>
                <div>Prepared By: {invoiceData?.loginUserName || "Staff"}</div>
                <div style={{ marginTop: "8px" }}>*** END OF ORDER ***</div>
            </div>
        </div>
    );
});

KitchenReceiptTemplate.displayName = "KitchenReceiptTemplate";
export default KitchenReceiptTemplate;
