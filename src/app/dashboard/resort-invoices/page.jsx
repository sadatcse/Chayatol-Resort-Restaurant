"use client";

import React, { useState, useEffect, useContext } from "react";
import { FiPlus, FiX, FiPrinter } from "react-icons/fi";
import Swal from "sweetalert2";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const openModal = () => {
    setFormData({ ...INITIAL_FORM_DATA });
    setItems([{ itemName: "Room Rent", description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].unitPrice) || 0;
      newItems[index].totalPrice = qty * price;
    }
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { itemName: "", description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subTotal = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const discountAmt = Number(formData.discount) || 0;
    const afterDiscount = Math.max(0, subTotal - discountAmt);
    const vatAmt = afterDiscount * ((Number(formData.vat) || 0) / 100);
    const scAmt = afterDiscount * ((Number(formData.serviceCharge) || 0) / 100);
    const grandTotal = afterDiscount + vatAmt + scAmt;

    return { subTotal, grandTotal };
  };

  const handleSubmit = async () => {
    if (!formData.customerName.trim()) {
      return Swal.fire("Error", "Customer name is required", "error");
    }
    
    const validItems = items.filter(i => i.itemName.trim() && i.unitPrice > 0);
    if (validItems.length === 0) {
      return Swal.fire("Error", "At least one valid item with a price is required", "error");
    }

    const { subTotal, grandTotal } = calculateTotals();

    const payload = {
      customer: {
        name: formData.customerName,
        phone: formData.customerPhone,
        email: formData.customerEmail,
        address: formData.customerAddress,
      },
      roomNo: formData.roomNo || null,
      checkInDate: formData.checkInDate || null,
      checkOutDate: formData.checkOutDate || null,
      items: validItems,
      subTotal,
      discount: Number(formData.discount) || 0,
      vat: Number(formData.vat) || 0,
      serviceCharge: Number(formData.serviceCharge) || 0,
      grandTotal,
      paymentMethod: formData.paymentMethod,
      paymentStatus: formData.paymentStatus,
      notes: formData.notes,
      createdBy: currentUser?._id
    };

    setIsSubmitting(true);
    try {
      const { data } = await axiosSecure.post("/resort-invoice/post", payload);
      if (data.success) {
        Swal.fire("Success", "Resort invoice created!", "success");
        closeModal();
        fetchInvoices();
      }
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to create invoice", "error");
    } finally {
      setIsSubmitting(false);
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
                        <button className="btn btn-xs btn-ghost text-brand-sage" title="Print (Coming Soon)">
                          <FiPrinter />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/50">
          <div className="modal-box max-w-4xl bg-white dark:bg-brand-charcoal rounded-2xl p-0">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-lg text-brand-primary uppercase">Create External Resort Invoice</h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost"><FiX /></button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="label py-1 text-xs font-bold uppercase">Customer Name *</label>
                  <input type="text" className="input input-sm input-bordered w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div>
                  <label className="label py-1 text-xs font-bold uppercase">Phone</label>
                  <input type="text" className="input input-sm input-bordered w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                </div>
                <div>
                  <label className="label py-1 text-xs font-bold uppercase">Room No</label>
                  <input type="text" className="input input-sm input-bordered w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={formData.roomNo} onChange={e => setFormData({...formData, roomNo: e.target.value})} />
                </div>
                <div>
                  <label className="label py-1 text-xs font-bold uppercase">Check-in Date</label>
                  <input type="date" className="input input-sm input-bordered w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={formData.checkInDate} onChange={e => setFormData({...formData, checkInDate: e.target.value})} />
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h4 className="font-bold text-sm mb-2 border-b pb-2">Line Items</h4>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs">Item Name</label>
                        <input type="text" className="input input-sm input-bordered w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={item.itemName} onChange={e => handleItemChange(index, 'itemName', e.target.value)} />
                      </div>
                      <div className="w-20">
                        <label className="text-xs">Qty</label>
                        <input type="number" min="1" className="input input-sm input-bordered w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} />
                      </div>
                      <div className="w-28">
                        <label className="text-xs">Unit Price</label>
                        <input type="number" min="0" className="input input-sm input-bordered w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} />
                      </div>
                      <div className="w-28">
                        <label className="text-xs">Total</label>
                        <input type="number" className="input input-sm input-bordered w-full bg-gray-50 dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={item.totalPrice} readOnly />
                      </div>
                      <button onClick={() => removeItemRow(index)} className="btn btn-sm btn-circle btn-ghost text-red-500 mb-1"><FiX /></button>
                    </div>
                  ))}
                  <button onClick={addItemRow} className="btn btn-xs btn-outline text-brand-primary mt-2">+ Add Item</button>
                </div>
              </div>

              {/* Totals & Payments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div className="space-y-3">
                  <h4 className="font-bold text-sm border-b pb-1">Payment Details</h4>
                  <div className="flex justify-between items-center">
                    <label className="text-xs">Payment Method</label>
                    <select className="select select-sm select-bordered w-32 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                      <option>Cash</option>
                      <option>Card</option>
                      <option>Mobile Banking</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-xs">Status</label>
                    <select className="select select-sm select-bordered w-32 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value})}>
                      <option>Paid</option>
                      <option>Unpaid</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm font-medium">
                  <div className="flex justify-between items-center">
                    <span>Sub Total:</span>
                    <span>৳{calculateTotals().subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Discount (Amt):</span>
                    <input type="number" className="input input-xs input-bordered w-20 text-right bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={formData.discount} onChange={e => setFormData({...formData, discount: e.target.value})} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>VAT (%):</span>
                    <input type="number" className="input input-xs input-bordered w-20 text-right bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} />
                  </div>
                  <div className="flex justify-between items-center border-t pt-2 font-bold text-brand-primary text-base">
                    <span>Grand Total:</span>
                    <span>৳{calculateTotals().grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
              <button onClick={closeModal} className="btn btn-ghost btn-sm px-6">Cancel</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="btn bg-brand-primary text-white border-none btn-sm px-8">
                {isSubmitting ? "Saving..." : "Save Invoice"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default ResortInvoicesPage;
