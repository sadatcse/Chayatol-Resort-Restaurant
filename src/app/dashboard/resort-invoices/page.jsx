"use client";

import React, { useState, useEffect, useContext } from "react";
import { FiPlus, FiX, FiPrinter, FiEdit, FiEye, FiTrash2 } from "react-icons/fi";
import Swal from "sweetalert2";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import ReceiptPrint from "@/components/pos/ReceiptPrint";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";

const INITIAL_FORM_DATA = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  roomNo: "",
  checkInDate: "",
  checkOutDate: "",
  discount: 0,
  vat: 0,
  serviceCharge: 0,
  paymentMethod: "Cash",
  paymentStatus: "Paid",
  notes: "",
};

const ResortInvoicesPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const openPrint = (invoice) => {
    setViewingInvoice(invoice);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };
  
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [items, setItems] = useState([
    { itemName: "Room Rent", description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }
  ]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosSecure.get("/resort-invoice");
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const openModal = (invoice = null) => {
    if (invoice) {
      window.location.href = `/dashboard/resort-pos?invoiceId=${invoice._id}`;
    } else {
      window.location.href = "/dashboard/resort-pos";
    }
  };

  const openViewModal = (invoice) => {
    setViewingInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (confirm.isConfirmed) {
      try {
        const { data } = await axiosSecure.delete(`/resort-invoice/delete/${id}`);
        if (data.success) {
          Swal.fire("Deleted!", "The invoice has been deleted.", "success");
          fetchInvoices();
        }
      } catch (error) {
        Swal.fire("Error", "Failed to delete invoice.", "error");
      }
    }
  };



  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans">
      <SectionHeader title="Resort Invoices" subtitle="Manage and generate external resort invoices." />

      <div className="flex justify-end mb-6">
        <button onClick={openModal} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none rounded-full gap-2 px-6">
          <FiPlus className="text-lg" />
          <span>New Resort Invoice</span>
        </button>
      </div>

      <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden">
        {isLoading ? (
          <div className="p-6"><MtableLoading /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead className="bg-brand-primary text-white font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-4 pl-6">Invoice No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Room No</th>
                  <th>Grand Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10">No invoices found.</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 pl-6 font-mono text-brand-primary font-bold">{inv.invoiceNo}</td>
                      <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="font-medium">{inv.customer?.name}</td>
                      <td>{inv.roomNo || "-"}</td>
                      <td className="font-bold">৳{inv.grandTotal?.toFixed(2)}</td>
                      <td>
                        <span className={`badge badge-sm border-none font-bold uppercase text-[10px] ${
                          inv.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2 items-center">
                          <button onClick={() => openViewModal(inv)} className="btn btn-xs btn-ghost text-blue-500" title="View">
                            <FiEye />
                          </button>
                          <button onClick={() => openPrint(inv)} className="btn btn-xs btn-ghost text-brand-sage" title="Print POS">
                            <FiPrinter />
                          </button>
                          <button onClick={() => openModal(inv)} className="btn btn-xs btn-ghost text-green-600" title="Edit">
                            <FiEdit />
                          </button>
                          <button onClick={() => handleDelete(inv._id)} className="btn btn-xs btn-ghost text-red-500" title="Delete">
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>



      {/* VIEW MODAL */}
      {isViewModalOpen && viewingInvoice && (
        <dialog className="modal modal-open bg-brand-charcoal/50">
          <div className="modal-box bg-white dark:bg-brand-charcoal rounded-2xl p-0">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-lg text-brand-primary uppercase">View Invoice: {viewingInvoice.invoiceNo}</h3>
              <button onClick={closeViewModal} className="btn btn-sm btn-circle btn-ghost"><FiX /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-500 text-xs">Customer Name</p>
                  <p className="font-bold">{viewingInvoice.customer?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Phone</p>
                  <p className="font-bold">{viewingInvoice.customer?.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Room No</p>
                  <p className="font-bold">{viewingInvoice.roomNo || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Status</p>
                  <p className={`font-bold ${viewingInvoice.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-500'}`}>{viewingInvoice.paymentStatus}</p>
                </div>
              </div>

              <h4 className="font-bold text-sm mb-2 border-b pb-2">Items</h4>
              <ul className="space-y-1 text-sm mb-4 max-h-40 overflow-y-auto">
                {viewingInvoice.items?.map((item, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{item.itemName} x{item.quantity}</span>
                    <span>৳{item.totalPrice?.toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t pt-2 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Sub Total:</span>
                  <span>৳{viewingInvoice.subTotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-৳{viewingInvoice.discount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-brand-primary text-base border-t mt-2 pt-2">
                  <span>Grand Total:</span>
                  <span>৳{viewingInvoice.grandTotal?.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
              <button onClick={() => openPrint(viewingInvoice)} className="btn bg-brand-sage text-white border-none btn-sm px-6">Print</button>
              <button onClick={closeViewModal} className="btn btn-ghost btn-sm px-6">Close</button>
            </div>
          </div>
        </dialog>
      )}

      {/* Hidden Print Component */}
      <ReceiptPrint ref={printRef} invoice={viewingInvoice} />
    </div>
  );
};

export default ResortInvoicesPage;
