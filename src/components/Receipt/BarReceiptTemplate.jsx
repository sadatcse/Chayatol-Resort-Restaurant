"use client";

import React, { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from "react";

const BarReceiptTemplate = forwardRef(({ profileData, invoiceData, onPrintComplete }, ref) => {
    const internalPrintRef = useRef();

    const getCurrentDateTime = () => {
        const options = {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
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
                    <title>Bar Order Ticket</title>
                    <style>
                        /* FORCE THERMAL PRINTER TO PRINT DARK */
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            font-weight: 900 !important;
                        }
                        @media print {
                            @page { margin: 0; size: 72mm auto; }
                            html, body {
                                margin: 0;
                                padding: 0;
                                font-family: "Courier New", "Lucida Console", monospace;
                                font-size: 14px;
                                font-weight: 900 !important;
                                letter-spacing: 0.4px;
                                color: #000;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                font-weight: 900 !important;
                            }
                            td, span, div, p {
                                font-weight: 900 !important;
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

    useImperativeHandle(ref, () => ({ printReceipt }));

    useEffect(() => {
        if (invoiceData) {
            const timer = setTimeout(() => printReceipt(), 400);
            return () => clearTimeout(timer);
        }
    }, [invoiceData, printReceipt]);

    if (!invoiceData) return null;

    const styles = {
        container: {
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            width: "72mm",
            margin: "auto",
            padding: "10px 8px",
            backgroundColor: "#fff",
            color: "#000",
            fontWeight: 900,
            letterSpacing: "0.4px",
        },
        header: { textAlign: "center", marginBottom: "12px" },
        barTitle: {
            fontSize: "22px",
            borderTop: "2px solid #000",
            borderBottom: "2px solid #000",
            display: "block",
            padding: "6px 0",
            marginBottom: "10px",
        },
        metaDataContainer: {
            textAlign: "left",
            fontSize: "13px",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
        },
        table: { width: "100%", borderCollapse: "collapse" },
        qtyCell: {
            width: "22%",
            fontSize: "26px",
            verticalAlign: "top",
            textAlign: "center",
            borderRight: "2px solid #000",
            padding: "8px 0",
        },
        itemCell: {
            padding: "8px 0 8px 12px",
            verticalAlign: "top",
        },
        dashedLine: { borderTop: "2px dashed #000", margin: "12px 0" },
        footer: {
            textAlign: "center",
            fontSize: "12px",
            marginTop: "15px",
        },
    };

    const displayProducts = Array.isArray(invoiceData?.products) 
        ? invoiceData.products.filter(item => item.drinkBar) 
        : [];

    if (displayProducts.length === 0) return null; // Only render bar ticket if there are drinks

    return (
        <div ref={internalPrintRef} style={styles.container}>
            <div style={styles.header}>
                <div style={styles.barTitle}>BAR TICKET</div>
                <div style={styles.metaDataContainer}>
                    <div>Order ID: #{invoiceData?.invoiceSerial || invoiceData?.invoiceNo}</div>
                    <div>Date: {getCurrentDateTime()}</div>
                    {invoiceData?.orderType && (
                        <div>Type: {invoiceData.orderType.toUpperCase()}</div>
                    )}
                    {(invoiceData?.tableName || invoiceData?.tableNo) && (
                        <div>TABLE: {invoiceData.tableName || invoiceData.tableNo}</div>
                    )}
                </div>
            </div>

            <div style={styles.dashedLine}></div>

            <table style={styles.table}>
                <tbody>
                    {displayProducts.map((item, index) => (
                        <React.Fragment key={index}>
                            <tr>
                                <td style={styles.qtyCell}>{item.qty || item.quantity}x</td>
                                <td style={styles.itemCell}>
                                    <span style={{ fontSize: "18px", display: "block" }}>
                                        {(item.productName || item.itemName).toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                            {index !== displayProducts.length - 1 && (
                                <tr>
                                    <td colSpan="2" style={{ borderBottom: "1px solid #ccc" }} />
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            <div style={styles.dashedLine}></div>

            <div style={styles.footer}>
                <p style={{ margin: "0 0 5px 0" }}>
                    Server: {invoiceData?.loginUserName || "Barman"}
                </p>
                <div
                    style={{
                        backgroundColor: "#000",
                        color: "#fff",
                        padding: "4px",
                        fontSize: "14px",
                        marginTop: "8px",
                    }}
                >
                    READY FOR PICKUP
                </div>
            </div>
        </div>
    );
});

BarReceiptTemplate.displayName = "BarReceiptTemplate";
export default BarReceiptTemplate;
