"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { format } from "date-fns";
import { MdSearch, MdReceipt, MdVisibility, MdDelete, MdPrint, MdClose, MdEdit } from "react-icons/md";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import ReceiptPrint from "@/components/pos/ReceiptPrint";
import { useReactToPrint } from "react-to-print";
import SectionHeader from "@/components/Comon/SectionHeader";

export default function InvoicesPage() {
  const router = useRouter();
  const axiosSecure = useAxiosSecure();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [printingInvoice, setPrintingInvoice] = useState(null);
  const printRef = useRef(null);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosSecure.get(`/pos/invoice?page=${page}&limit=15`);
      if (data.success) {
        setInvoices(data.data);
        setTotalPages(Math.ceil(data.total / data.limit));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [axiosSecure, page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Invoice",
  });

  const printReceipt = useCallback((invoice) => {
    setPrintingInvoice(invoice);
    setTimeout(() => {
      handlePrint();
    }, 100);
  }, [handlePrint]);

  const printBatchReceipt = useCallback((invoice, batch, batchIndex) => {
    const batchSubTotal = batch.items?.reduce((acc, item) => acc + (item.totalPrice || 0), 0) || 0;
    const batchInvoice = {
      ...invoice,
      invoiceNo: `${invoice.invoiceNo}-B${batchIndex + 1}`,
      orderBatches: null, // Clear to force printing from items
      items: batch.items,
      subTotal: batchSubTotal,
      discount: 0,
      vat: 0,
      sd: 0,
      serviceCharge: 0,
      grandTotal: batchSubTotal,
      paymentMethod: "Pending" // KOT isn't fully paid on its own usually
    };
    setPrintingInvoice(batchInvoice);
    setTimeout(() => {
      handlePrint();
    }, 100);
  }, [handlePrint]);

  const deleteInvoice = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const { data } = await axiosSecure.delete(`/pos/invoice/${id}`);
        if (data.success) {
          Swal.fire('Deleted!', 'Invoice has been deleted.', 'success');
          fetchInvoices();
        }
      } catch (err) {
        Swal.fire('Error', 'Failed to delete invoice.', 'error');
      }
    }
  };

  return (
    <div className="bg-white dark:bg-brand-charcoal rounded-xl shadow-md border border-brand-beige/50 dark:border-brand-dark-grey/50">
      
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-brand-beige/50 dark:border-brand-dark-grey/50">
        <SectionHeader 
          title="Invoices History" 
          subtitle="View and manage all POS transactions" 
          className="!mb-0" 
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto p-4 md:p-6">
        <table className="table w-full">
          <thead>
            <tr className="border-b border-brand-beige/50 dark:border-brand-dark-grey/50 text-gray-500 dark:text-gray-400 text-sm">
              <th>Invoice No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Method</th>
              <th>Amount (৳)</th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-10">
                  <span className="loading loading-spinner text-brand-primary"></span>
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-gray-400">No invoices found.</td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id} className="border-b border-gray-100 dark:border-brand-dark-grey/30 hover:bg-gray-50 dark:hover:bg-brand-dark-grey/20">
                  <td className="font-semibold text-brand-primary">{inv.invoiceNo}</td>
                  <td className="text-gray-600 dark:text-gray-300">{format(new Date(inv.createdAt), 'dd MMM yyyy, p')}</td>
                  <td>
                    <div className="font-medium dark:text-gray-200">{inv.customer?.name || "Walk-in"}</div>
                    <div className="text-xs text-gray-400">{inv.customer?.phone}</div>
                  </td>
                  <td>
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                      {inv.orderType || inv.orderSource}
                    </span>
                  </td>
                  <td className="text-gray-600 dark:text-gray-300">{inv.paymentMethod}</td>
                  <td className="font-bold text-brand-dark-grey dark:text-gray-200">{inv.grandTotal.toFixed(2)}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      inv.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => router.push(`/dashboard/pos?invoiceId=${inv._id}`)} className="p-2 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 transition" title="Add Items / Edit">
                        <MdEdit />
                      </button>
                      <button onClick={() => { setSelectedInvoice(inv); setIsViewModalOpen(true); }} className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 transition" title="View">
                        <MdVisibility />
                      </button>
                      <button onClick={() => printReceipt(inv)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition" title="Print">
                        <MdPrint />
                      </button>
                      <button onClick={() => deleteInvoice(inv._id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition" title="Delete">
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="p-4 md:p-6 border-t border-brand-beige/50 dark:border-brand-dark-grey/50 flex justify-center">
          <div className="join">
            <button className="join-item btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>«</button>
            <button className="join-item btn btn-sm">Page {page} of {totalPages}</button>
            <button className="join-item btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>»</button>
          </div>
        </div>
      )}

      {/* Hidden printer component */}
      {printingInvoice && <ReceiptPrint ref={printRef} invoice={printingInvoice} />}

      {/* View Modal */}
      {isViewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-brand-charcoal rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-brand-primary text-white">
              <h2 className="text-xl font-bold">Invoice Details</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-white hover:text-gray-200">
                <MdClose size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div className="flex justify-between border-b pb-2 dark:border-gray-700">
                <span className="font-bold dark:text-white">Invoice No:</span>
                <span className="text-brand-primary font-bold">{selectedInvoice.invoiceNo}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm dark:text-gray-200">
                <div>
                  <p className="text-gray-500 text-xs">Customer</p>
                  <p className="font-medium">{selectedInvoice.customer?.name || "Walk-in"}</p>
                  <p className="text-gray-500">{selectedInvoice.customer?.phone}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Date</p>
                  <p className="font-medium">{format(new Date(selectedInvoice.createdAt), 'dd MMM yyyy, p')}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Order Source</p>
                  <p className="font-medium">{selectedInvoice.orderType || selectedInvoice.orderSource} {selectedInvoice.tableNo ? `(Table: ${selectedInvoice.tableNo})` : ''} {selectedInvoice.roomNo ? `(Room: ${selectedInvoice.roomNo})` : ''}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Payment Method</p>
                  <p className="font-medium">{selectedInvoice.paymentMethod}</p>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-bold mb-2 dark:text-white border-b pb-1 dark:border-gray-700">Orders</h4>
                {selectedInvoice.orderBatches && selectedInvoice.orderBatches.length > 0 ? (
                  <div className="space-y-4">
                    {selectedInvoice.orderBatches.map((batch, bIdx) => (
                      <div key={bIdx} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                           <span className="font-bold text-sm dark:text-gray-200">
                              Order {bIdx + 1} 
                              <span className="text-xs font-normal text-gray-500 ml-2">
                                 {batch.orderedAt ? format(new Date(batch.orderedAt), 'p') : ''}
                              </span>
                           </span>
                           <button onClick={() => printBatchReceipt(selectedInvoice, batch, bIdx)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 transition-colors">
                              <MdPrint size={14} /> Print Batch
                           </button>
                        </div>
                        <div className="space-y-1">
                          {batch.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm dark:text-gray-300">
                              <span>{item.itemName} x{item.quantity}</span>
                              <span>৳ {item.totalPrice?.toFixed(2) || item.totalPrice}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedInvoice.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm dark:text-gray-300">
                        <span>{item.itemName} x{item.quantity}</span>
                        <span>৳ {item.totalPrice?.toFixed(2) || item.totalPrice}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-brand-dark-grey p-4 rounded-lg mt-4 border border-gray-200 dark:border-gray-700 space-y-1 text-sm dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>৳ {selectedInvoice.subTotal?.toFixed(2) || '0.00'}</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount:</span>
                    <span>- ৳ {selectedInvoice.discount?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {selectedInvoice.vat > 0 && (
                  <div className="flex justify-between">
                    <span>VAT:</span>
                    <span>+ ৳ {selectedInvoice.vat?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {selectedInvoice.sd > 0 && (
                  <div className="flex justify-between">
                    <span>SD:</span>
                    <span>+ ৳ {selectedInvoice.sd?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {selectedInvoice.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge:</span>
                    <span>+ ৳ {selectedInvoice.serviceCharge?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg dark:text-white pt-2 border-t mt-2 dark:border-gray-600">
                  <span>Grand Total:</span>
                  <span className="text-brand-primary">৳ {selectedInvoice.grandTotal?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-brand-dark-grey flex justify-end">
               <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-colors">
                  Close
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
