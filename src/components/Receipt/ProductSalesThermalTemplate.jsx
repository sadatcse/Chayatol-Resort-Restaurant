"use client";
import React, { forwardRef, useImperativeHandle, useRef, useCallback } from "react";

const ProductSalesThermalTemplate = forwardRef(({ profileData, data, startDate, endDate, selectedCategory, totalQuantity, totalRevenue, onPrintComplete }, ref) => {
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
                    <title>Product Sales Report</title>
                    <style>
                        * {
                            font-weight: bold !important;
                            color: #000 !important;
                        }
                        @media print {
                            @page { margin: 0; size: 72mm auto; }
                            body { 
                                margin: 0; 
                                font-family: Arial, Helvetica, sans-serif; 
                                font-size: 11px;
                                font-weight: bold;
                            }
                            table { width: 100%; border-collapse: collapse; }
                            td, th { padding: 3px 0; }
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

    if (!data || data.length === 0) return null;

    const styles = {
        container: { 
            fontFamily: "Arial, Helvetica, sans-serif",
            width: "72mm", 
            margin: "auto", 
            padding: "10px", 
            fontSize: "11px", 
            color: "#000", 
            backgroundColor: "#fff",
            fontWeight: "bold"
        },
        header: { textAlign: "center", marginBottom: "10px" },
        table: { width: "100%", borderCollapse: "collapse", fontSize: "10px", fontWeight: "bold" },
        tableHeaderCell: { textAlign: "left", padding: "3px 0", borderBottom: "2px dashed #000", fontWeight: "bold" },
        tableDataCell: { textAlign: "left", padding: "3px 0", fontWeight: "bold" },
        tableCellRight: { textAlign: "right", padding: "3px 0", fontWeight: "bold" },
        dashedLine: { margin: "8px 0", borderTop: "2px dashed #000" },
        footer: { textAlign: "center", marginTop: "10px" },
        companyName: { fontSize: "15px", fontWeight: "bold", marginBottom: "2px" },
        infoText: { fontSize: "11px", margin: "2px 0", fontWeight: "bold" },
        titleText: { fontSize: "13px", margin: "4px 0", fontWeight: "bold", textAlign: "center", textTransform: "uppercase" },
        normalText: { fontSize: "11px", margin: "2px 0", textAlign: "left", fontWeight: "bold" },
        totalLine: { fontWeight: "bold", fontSize: "12px" },
    };

    return (
        <div ref={internalPrintRef} style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.companyName}>{profileData?.name || "Chayatol Resort & Restaurant"}</h2>
                <p style={styles.infoText}>{profileData?.address || "123 Resort Road, Sylhet"}</p>
                <p style={styles.infoText}>Contact: {profileData?.phone || "+880 1700 000000"}</p>
            </div>

            <div style={styles.dashedLine}></div>

            <h3 style={styles.titleText}>Product Sales Report</h3>
            <p style={styles.normalText}>Category: {selectedCategory || "All"}</p>
            <p style={styles.normalText}>From: {new Date(startDate).toLocaleDateString("en-GB")}</p>
            <p style={styles.normalText}>To: {new Date(endDate).toLocaleDateString("en-GB")}</p>
            <p style={styles.normalText}>Generated: {getCurrentDateTime()}</p>

            <div style={styles.dashedLine}></div>

            {/* Product list */}
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.tableHeaderCell}>Item Name</th>
                        <th style={{...styles.tableHeaderCell, ...styles.tableCellRight}}>Rate</th>
                        <th style={{...styles.tableHeaderCell, ...styles.tableCellRight}}>Qty</th>
                        <th style={{...styles.tableHeaderCell, ...styles.tableCellRight}}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, idx) => (
                        <tr key={idx}>
                            <td style={styles.tableDataCell}>{item.productName || "Unknown"}</td>
                            <td style={styles.tableCellRight}>৳ {item.rate.toFixed(0)}</td>
                            <td style={styles.tableCellRight}>{item.qty}</td>
                            <td style={styles.tableCellRight}>৳ {(item.qty * item.rate).toFixed(0)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={styles.dashedLine}></div>

            {/* Summary Totals */}
            <div style={{ textAlign: "right", fontSize: "11px" }}>
                <p style={styles.infoText}>Total Quantity Sold: {totalQuantity}</p>
                <p style={styles.totalLine}>Total Revenue: ৳ {totalRevenue.toFixed(0)}</p>
            </div>

            <div style={styles.dashedLine}></div>
            <div style={styles.footer}>
                <p style={styles.infoText}>End of Report</p>
            </div>
        </div>
    );
});

ProductSalesThermalTemplate.displayName = "ProductSalesThermalTemplate";
export default ProductSalesThermalTemplate;
