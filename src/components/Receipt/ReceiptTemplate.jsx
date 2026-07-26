"use client";

import React, { forwardRef, useImperativeHandle, useRef, useCallback } from "react";

const ReceiptTemplate = forwardRef(({ profileData, invoiceData, onPrintComplete }, ref) => {
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
                    <title>Invoice</title>
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
                                font-size: 12px;
                                font-weight: bold;
                            }
                            table { width: 100%; border-collapse: collapse; }
                            td, th { padding: 2px 0; }
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

    if (!invoiceData) return null;
    
    // --- STYLES ---
    const styles = {
        container: { 
            fontFamily: "Arial, Helvetica, sans-serif",
            width: "72mm", 
            margin: "auto", 
            padding: "10px", 
            fontSize: "12px", 
            color: "#000", 
            backgroundColor: "#fff",
            fontWeight: "bold"
        },
        header: { textAlign: "center", marginBottom: "10px" },
        table: { width: "100%", borderCollapse: "collapse", fontSize: "12px", fontWeight: "bold" },
        tableHeaderCell: { textAlign: "left", padding: "2px 0", borderBottom: "2px dashed #000", fontWeight: "bold" },
        tableDataCell: { textAlign: "left", padding: "2px 0", fontWeight: "bold" },
        tableCellRight: { textAlign: "right", padding: "2px 0", fontWeight: "bold" },
        dashedLine: { margin: "8px 0", borderTop: "2px dashed #000" },
        footer: { textAlign: "center", marginTop: "10px" },
        companyName: { fontSize: "18px", fontWeight: "bold", marginBottom: "2px" },
        infoText: { fontSize: "12px", margin: "2px 0", fontWeight: "bold" },
        largeBoldText: { fontSize: "14px", margin: "4px 0", fontWeight: "bold" },
        normalText: { fontSize: "12px", margin: "2px 0", textAlign: "left", fontWeight: "bold" },
        orderMethodText: { fontSize: "14px", fontStyle: "italic", fontWeight: "bold", marginTop: "10px" },
        totalLine: { fontWeight: "bold", fontSize: "14px" },
    };

    const subTotalVal = invoiceData.subtotal || invoiceData.subTotal || 0;
    const vatRate = invoiceData.vatRate !== undefined ? invoiceData.vatRate : (subTotalVal ? Math.round(((invoiceData.vat || 0) / subTotalVal) * 100) : 0);
    const sdRate = invoiceData.sdRate !== undefined ? invoiceData.sdRate : (subTotalVal ? Math.round(((invoiceData.sd || 0) / subTotalVal) * 100) : 0);
    const scRate = invoiceData.scRate !== undefined ? invoiceData.scRate : (subTotalVal ? Math.round(((invoiceData.serviceCharge || invoiceData.sc || 0) / subTotalVal) * 100) : 0);

    return (
        <div ref={internalPrintRef} style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.companyName}>{profileData?.name || "Chayatol Resort & Restaurant"}</h2>
                <p style={styles.infoText}>{profileData?.address || "123 Resort Road, Sylhet"}</p>
                <p style={styles.infoText}>Contact: {profileData?.phone || "+880 1700 000000"}</p>
                <p style={styles.infoText}>Bin No: {profileData?.binNumber || "N/A"}</p>
            </div>

            <div style={styles.dashedLine}></div>

            {/* Info */}
            <div>
                <p style={styles.normalText}>Invoice: {invoiceData?.invoiceSerial || invoiceData?.invoiceNo || "N/A"}</p>
                <p style={styles.normalText}>Date: {new Date(invoiceData?.dateTime || invoiceData?.createdAt || Date.now()).toLocaleString("en-GB")}</p>
                <p style={styles.normalText}>Served By: {invoiceData?.loginUserName || invoiceData?.createdBy?.name || invoiceData?.waiterName || "Staff"}</p>
                {invoiceData?.orderType?.toLowerCase() === "dine-in" && (invoiceData?.tableName || invoiceData?.tableNo) && (
                    <p style={styles.normalText}>Table: {invoiceData.tableName || invoiceData.tableNo}</p>
                )}
                {invoiceData?.roomNo && (
                    <p style={styles.normalText}>Room: {invoiceData.roomNo}</p>
                )}
                <p style={styles.normalText}>Customer: {invoiceData?.customerName || invoiceData?.customer?.name || "Guest"}</p>
            </div>

            <div style={styles.dashedLine}></div>

            {/* Items Table */}
            {Array.isArray(invoiceData?.products) && invoiceData.products.length > 0 ? (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.tableHeaderCell}>Item</th>
                            <th style={{...styles.tableHeaderCell, ...styles.tableCellRight}}>Qty</th>
                            <th style={{...styles.tableHeaderCell, ...styles.tableCellRight}}>Price</th>
                            <th style={{...styles.tableHeaderCell, ...styles.tableCellRight}}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoiceData.products.map((item, index) => (
                            <tr key={index}>
                                <td style={styles.tableDataCell}>{item.productName || "Unknown"}</td>
                                <td style={styles.tableCellRight}>{item.qty || item.quantity || 0}</td>
                                <td style={styles.tableCellRight}>৳ {(item.rate || item.unitPrice || 0).toFixed(1)}</td>
                                <td style={styles.tableCellRight}>
                                    {item.isComplimentary ? "FREE" : `৳ ${(item.subtotal || item.totalPrice || 0).toFixed(1)}`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : Array.isArray(invoiceData?.orderBatches) && invoiceData.orderBatches.length > 0 ? (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.tableHeaderCell}>Item</th>
                            <th style={{...styles.tableHeaderCell, ...styles.tableCellRight}}>Qty</th>
                            <th style={{...styles.tableHeaderCell, ...styles.tableCellRight}}>Price</th>
                            <th style={{...styles.tableHeaderCell, ...styles.tableCellRight}}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoiceData.orderBatches.flatMap(b => b.items || []).map((item, index) => (
                            <tr key={index}>
                                <td style={styles.tableDataCell}>{item.itemName || "Unknown"}</td>
                                <td style={styles.tableCellRight}>{item.quantity || 0}</td>
                                <td style={styles.tableCellRight}>{(item.unitPrice || 0).toFixed(1)}</td>
                                <td style={styles.tableCellRight}>
                                    {(item.totalPrice || 0).toFixed(1)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p style={{ textAlign: "center", fontWeight: "bold" }}>No items.</p>
            )}
            
            <div style={styles.dashedLine}></div>

            {/* Totals Section */}
            <div style={{ textAlign: "right" }}>
                <p style={styles.infoText}>Subtotal: ৳ {subTotalVal.toFixed(1)}</p>

                {invoiceData?.vat > 0 && (
                    <p style={styles.infoText}>VAT ({vatRate}%): ৳ {invoiceData.vat.toFixed(1)}</p>
                )}

                {invoiceData?.sd > 0 && (
                    <p style={styles.infoText}>SD ({sdRate}%): ৳ {invoiceData.sd.toFixed(1)}</p>
                )}

                {((invoiceData?.serviceCharge || invoiceData?.sc) > 0) && (
                    <p style={styles.infoText}>Service Charge ({scRate}%): ৳ {(invoiceData.serviceCharge || invoiceData.sc || 0).toFixed(1)}</p>
                )}

                {invoiceData?.deliveryCharge > 0 && (
                    <p style={styles.infoText}>Delivery Charge: ৳ {invoiceData.deliveryCharge.toFixed(1)}</p>
                )}

                {invoiceData?.discount > 0 && (
                    <p style={styles.infoText}>Discount: ৳ {invoiceData.discount.toFixed(1)}</p>
                )}
                <p style={styles.totalLine}>
                    Total: ৳ {(invoiceData?.totalAmount || invoiceData?.grandTotal || 0).toFixed(1)}
                </p>

                {invoiceData?.paymentMethod?.toLowerCase() === "room bill" && (
                    <p style={{ fontSize: "14px", fontWeight: "black", textAlign: "right", margin: "6px 0", letterSpacing: "0.5px" }}>
                        *** ADDED TO ROOM BILL ***
                    </p>
                )}

                {(invoiceData?.paidAmount > 0 || invoiceData?.paid > 0) && (
                    <p style={styles.infoText}>Paid: ৳ {(invoiceData.paidAmount || invoiceData.paid || 0).toFixed(1)}</p>
                )}

                {(invoiceData?.changeAmount > 0 || invoiceData?.change > 0) && (
                    <p style={styles.infoText}>Change Return: ৳ {(invoiceData.changeAmount || invoiceData.change || 0).toFixed(1)}</p>
                )}
            </div>

            <div style={styles.dashedLine}></div>

            {/* Footer */}
            <div style={{ textAlign: "center" }}>
                <p style={styles.orderMethodText}>Order Type: {invoiceData?.orderType || "N/A"}</p>
            </div>
            <div style={styles.footer}>
                <p style={styles.infoText}>Thank you for your visit!</p>
                <p style={styles.infoText}>{profileData?.website || "www.chayatolresort.com"}</p>
                <p style={{ fontSize: "10px", marginTop: "5px", fontWeight: "bold" }}>
                    Printed On: {getCurrentDateTime()}
                </p>
            </div>
        </div>
    );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';
export default ReceiptTemplate;
