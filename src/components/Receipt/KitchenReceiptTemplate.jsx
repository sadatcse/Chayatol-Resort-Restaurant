"use client";

import React, { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from "react";

const KitchenReceiptTemplate = forwardRef(({ profileData, invoiceData, onPrintComplete }, ref) => {
    const internalPrintRef = useRef();

    const getCurrentDateTime = () => {
        const options = {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true, 
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
                    <title>Kitchen Order Ticket</title>
                    <style>
                        /* GLOBAL RESET for Thermal Printer */
                        * {
                            font-weight: bold !important;
                            color: #000 !important;
                        }
                        @media print {
                            @page { margin: 0; size: 72mm auto; }
                            body { 
                                margin: 0; 
                                font-family: Arial, Helvetica, sans-serif; 
                                font-size: 14px;
                                font-weight: bold;
                            }
                            table { width: 100%; border-collapse: collapse; }
                            td, th { padding: 4px 0; }
                            h1, h2, h3, h4, p, span, td, th {
                                -webkit-print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${node.outerHTML}
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
    }, [onPrintComplete]);

    useImperativeHandle(ref, () => ({
        printReceipt,
    }));

    useEffect(() => {
        if (invoiceData) {
            const timer = setTimeout(() => printReceipt(), 500);
            return () => clearTimeout(timer);
        }
    }, [invoiceData, printReceipt]);

    if (!invoiceData) return null;

    const styles = {
        container: { 
            fontFamily: "Arial, Helvetica, sans-serif", 
            width: "72mm", 
            margin: "auto", 
            padding: "10px", 
            fontSize: "14px", 
            color: "#000", 
            backgroundColor: "#fff",
            fontWeight: "bold"
        },
        header: { textAlign: "center", marginBottom: "10px" },
        table: { width: "100%", borderCollapse: "collapse", fontWeight: "bold" },
        tableHeaderCell: { textAlign: "left", padding: "4px 0", borderBottom: "2px dashed #000", fontWeight: "bold" },
        tableDataCell: { textAlign: "left", padding: "4px 0", fontWeight: "bold" },
        dashedLine: { margin: "8px 0", borderTop: "2px dashed #000" },
        footer: { textAlign: "center", marginTop: "10px" },
        companyName: { fontSize: "20px", fontWeight: "bold", marginBottom: "2px" },
        kotTitle: { fontSize: "18px", fontWeight: "bold", border: "3px solid #000", display:"inline-block", padding: "4px 8px", margin: "5px 0" },
        infoText: { fontSize: "14px", margin: "2px 0", fontWeight: "bold" },
        largeText: { fontSize: "16px", fontWeight: "bold" },
        normalText: { fontSize: "14px", margin: "2px 0", textAlign: "left", fontWeight: "bold" },
    };

    return (
        <div ref={internalPrintRef} style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.companyName}>{profileData?.name || "Chayatol Resort & Restaurant"}</h2>
                <div style={styles.kotTitle}>KITCHEN TICKET</div>
            </div>

            <div style={styles.dashedLine}></div>

            <div>
                <p style={styles.normalText}><strong>Ticket #:</strong> {invoiceData?.invoiceSerial || invoiceData?.invoiceNo || "N/A"}</p>
                <p style={styles.normalText}><strong>Date:</strong> {getCurrentDateTime()}</p>
                
                {invoiceData?.orderType === "dine-in" && (invoiceData?.tableName || invoiceData?.tableNo) && (
                    <p style={{...styles.normalText, fontSize: "18px"}}>
                        Table: {invoiceData.tableName || invoiceData.tableNo}
                    </p>
                )}
                
                {invoiceData?.orderType === "delivery" && (
                    <p style={styles.normalText}><strong>Delivery:</strong> {invoiceData?.deliveryProvider || "General"}</p>
                )}
                
                <p style={styles.normalText}><strong>Type:</strong> {invoiceData?.orderType?.toUpperCase()}</p>
            </div>

            <div style={styles.dashedLine}></div>

            {Array.isArray(invoiceData?.products) && invoiceData.products.length > 0 ? (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{...styles.tableHeaderCell, width: "15%"}}>Qty</th>
                            <th style={styles.tableHeaderCell}>Item Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoiceData.products.map((item, index) => (
                            <tr key={index}>
                                <td style={{...styles.tableDataCell, verticalAlign: 'top', fontSize: "18px"}}>
                                    {item.qty || item.quantity || 0}
                                </td>
                                <td style={styles.tableDataCell}>
                                    {item.productName || "Unknown"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : Array.isArray(invoiceData?.orderBatches) && invoiceData.orderBatches.length > 0 ? (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{...styles.tableHeaderCell, width: "15%"}}>Qty</th>
                            <th style={styles.tableHeaderCell}>Item Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoiceData.orderBatches.flatMap(b => b.items || []).map((item, index) => (
                            <tr key={index}>
                                <td style={{...styles.tableDataCell, verticalAlign: 'top', fontSize: "18px"}}>
                                    {item.quantity || 0}
                                </td>
                                <td style={styles.tableDataCell}>
                                    {item.itemName || "Unknown"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p style={{ textAlign: "center", fontWeight: "bold" }}>No items.</p>
            )}

            <div style={styles.dashedLine}></div>

            <div style={styles.footer}>
                <p style={styles.infoText}>Prepared By: {invoiceData?.loginUserName || "Server"}</p>
                <p style={{ fontSize: "14px", marginTop: "10px", fontWeight: "bold" }}>*** END OF KOT ***</p>
            </div>
        </div>
    );
});

KitchenReceiptTemplate.displayName = 'KitchenReceiptTemplate';
export default KitchenReceiptTemplate;
