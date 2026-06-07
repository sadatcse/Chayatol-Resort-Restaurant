"use client";

import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import Swal from "sweetalert2";

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  subTotal,
  vat,
  sd,
  serviceCharge,
  discount,
  grandTotal,
  onSuccess
}) {
  const axiosSecure = useAxiosSecure();
  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [orderSource, setOrderSource] = useState("Dine In");
  const [tableNo, setTableNo] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");

  const [tables, setTables] = useState([]);

  React.useEffect(() => {
    const fetchTables = async () => {
      try {
        const { data } = await axiosSecure.get("/restauranttable");
        setTables(data || []);
      } catch (err) {
        console.error("Failed to fetch tables", err);
      }
    };
    if (isOpen) {
      fetchTables();
    }
  }, [isOpen, axiosSecure]);

  if (!isOpen) return null;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      Swal.fire("Error", "Cart is empty", "error");
      return;
    }

    setLoading(true);

    const payload = {
      customer: { name: customerName, phone: customerPhone },
      items: cart,
      subTotal,
      vat,
      sd,
      serviceCharge,
      discount,
      grandTotal,
      paymentMethod,
      orderSource,
      tableNo: orderSource === "Dine In" ? tableNo : "",
      roomNo: orderSource === "Room Service" ? roomNo : "",
      transactionId,
      notes,
      invoiceType: "Restaurant" // Defaulting for POS
    };

    try {
      const { data } = await axiosSecure.post("/pos/invoice", payload);
      if (data.success) {
        Swal.fire("Success", "Invoice generated successfully", "success");
        onSuccess(data.data);
      } else {
        Swal.fire("Error", data.error || "Failed to create invoice", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-brand-charcoal rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-brand-primary text-white">
          <h2 className="text-xl font-bold">Checkout</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <MdClose size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
            
            {/* Order Type & Table/Room */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">Order Source</label>
                <select 
                  className="w-full border rounded-lg p-2 dark:bg-brand-dark-grey dark:border-gray-600 dark:text-white"
                  value={orderSource}
                  onChange={(e) => setOrderSource(e.target.value)}
                >
                  <option value="Dine In">Dine In</option>
                  <option value="Takeaway">Takeaway</option>
                  <option value="Room Service">Room Service</option>
                  <option value="Delivery">Delivery</option>
                </select>
              </div>

              {orderSource === "Dine In" && (
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-200">Table No</label>
                  <select
                    className="w-full border rounded-lg p-2 dark:bg-brand-dark-grey dark:border-gray-600 dark:text-white"
                    value={tableNo}
                    onChange={(e) => setTableNo(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Table</option>
                    {tables.map(t => (
                      <option key={t._id} value={t.tableName}>{t.tableName}</option>
                    ))}
                  </select>
                </div>
              )}

              {orderSource === "Room Service" && (
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-200">Room No</label>
                  <input type="text" className="w-full border rounded-lg p-2 dark:bg-brand-dark-grey dark:border-gray-600 dark:text-white"
                    value={roomNo} onChange={(e) => setRoomNo(e.target.value)} placeholder="e.g. 101" required />
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">Customer Name (Optional)</label>
                <input type="text" className="w-full border rounded-lg p-2 dark:bg-brand-dark-grey dark:border-gray-600 dark:text-white"
                  value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">Phone (Optional)</label>
                <input type="text" className="w-full border rounded-lg p-2 dark:bg-brand-dark-grey dark:border-gray-600 dark:text-white"
                  value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="01700000000" />
              </div>
            </div>

            {/* Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">Payment Method</label>
                <select 
                  className="w-full border rounded-lg p-2 dark:bg-brand-dark-grey dark:border-gray-600 dark:text-white"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Mobile Banking">Mobile Banking</option>
                  <option value="Room Charge">Room Charge</option>
                </select>
              </div>

              {(paymentMethod === "Mobile Banking" || paymentMethod === "Card") && (
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-200">Transaction ID</label>
                  <input type="text" className="w-full border rounded-lg p-2 dark:bg-brand-dark-grey dark:border-gray-600 dark:text-white"
                    value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="TrxID..." required />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">Notes (Optional)</label>
              <textarea className="w-full border rounded-lg p-2 dark:bg-brand-dark-grey dark:border-gray-600 dark:text-white"
                value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions..." rows={2} />
            </div>

            <div className="bg-gray-50 dark:bg-brand-dark-grey p-4 rounded-lg mt-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between font-bold text-lg dark:text-white">
                <span>Grand Total:</span>
                <span className="text-brand-primary">৳ {grandTotal.toFixed(2)}</span>
              </div>
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-brand-dark-grey flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" form="checkout-form" disabled={loading} className="px-5 py-2 rounded-lg bg-brand-primary text-white font-medium hover:bg-brand-primary/90 transition-colors disabled:opacity-50">
            {loading ? "Processing..." : "Confirm & Pay"}
          </button>
        </div>

      </div>
    </div>
  );
}
