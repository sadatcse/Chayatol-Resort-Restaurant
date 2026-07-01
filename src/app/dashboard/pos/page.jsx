"use client";

import React, { useState, useEffect, useContext, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import useFood from "@/hooks/useFood";
import useFoodCategories from "@/hooks/useFoodCategories";
import CustomerModal from "@/components/CustomerModal";
import ProductSelection from "@/components/pos/ProductSelection";
import OrderSummary from "@/components/pos/OrderSummary";
import ReceiptTemplate from "@/components/Receipt/ReceiptTemplate";
import KitchenReceiptTemplate from "@/components/Receipt/KitchenReceiptTemplate";
import BarReceiptTemplate from "@/components/Receipt/BarReceiptTemplate";

function POSContent() {
    const searchParams = useSearchParams();
    const invoiceId = searchParams.get("invoiceId");

    const { user } = useContext(AuthContext);
    const loginUserEmail = user?.email || "info@chayatolresort.com";
    const loginUserName = user?.name || "Server Staff";

    const axiosSecure = useAxiosSecure();

    // Data-fetching hooks
    const { foods, isLoading: loadingProducts } = useFood(1, 1000);
    const { categories, isLoading: loadingCategories } = useFoodCategories(1, 100);

    // POS States
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [addedProducts, setAddedProducts] = useState([]);
    const [orderType, setOrderType] = useState("dine-in");
    const [TableName, setTableName] = useState("");
    const [roomNo, setRoomNo] = useState("");
    const [deliveryProvider, setDeliveryProvider] = useState("");
    const [invoiceSummary, setInvoiceSummary] = useState({ discount: 0, paid: 0 });
    const [discountType, setDiscountType] = useState("Percent");
    const [kotRound, setKotRound] = useState(1);
    
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Cash");
    const [selectedSubMethod, setSelectedSubMethod] = useState('');
    const [selectedCardIcon, setSelectedCardIcon] = useState(null);
    const [customDateTime, setCustomDateTime] = useState("");

    // Auxiliary Data (Tables, Rooms, Company info)
    const [tables, setTables] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentInvoiceId, setCurrentInvoiceId] = useState(null);

    // Customer & Modals
    const [mobile, setMobile] = useState("");
    const [customer, setCustomer] = useState(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    // Print Refs & States
    const receiptRef = useRef();
    const kitchenReceiptRef = useRef();
    const barReceiptRef = useRef();
    const [printData, setPrintData] = useState(null);
    const [printKitchenData, setPrintKitchenData] = useState(null);
    const [printBarData, setPrintBarData] = useState(null);

    // Fetch auxiliary data
    useEffect(() => {
        const fetchAuxData = async () => {
            try {
                const [tablesRes, roomsRes, companyRes] = await Promise.all([
                    axiosSecure.get("/restauranttable").catch(() => ({ data: [] })),
                    axiosSecure.get("/room").catch(() => ({ data: [] })),
                    axiosSecure.get("/company").catch(() => ({ data: [] }))
                ]);
                if (tablesRes.data) setTables(tablesRes.data);
                if (roomsRes.data) {
                    setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : (roomsRes.data.data || []));
                }
                if (companyRes.data && companyRes.data.length > 0) {
                    setCompanyInfo(companyRes.data[0]);
                }
            } catch (e) {
                console.error("Auxiliary fetch failed", e);
            }
        };
        fetchAuxData();
    }, [axiosSecure]);

    // Load Invoice for Edit Mode
    useEffect(() => {
        if (!invoiceId) return;
        const fetchInvoice = async () => {
            try {
                setIsProcessing(true);
                const { data } = await axiosSecure.get(`/pos/invoice/${invoiceId}`);
                if (data.success && data.data) {
                    const inv = data.data;
                    setCurrentInvoiceId(inv._id);
                    setOrderType(inv.orderType || "dine-in");
                    setTableName(inv.tableName || "");
                    setRoomNo(inv.roomNo || "");
                    setDeliveryProvider(inv.deliveryProvider || "");
                    setKotRound((inv.kotRound || 1) + 1); // Increment KOT round for updates
                    
                    if (inv.customerName) {
                        setCustomer({
                            fullName: inv.customerName,
                            phoneNumber: inv.customerMobile
                        });
                        setMobile(inv.customerMobile);
                    } else if (inv.customer) {
                        setCustomer({
                            fullName: inv.customer.name,
                            phoneNumber: inv.customer.phone
                        });
                        setMobile(inv.customer.phone || "");
                    }

                    // Map products back into cart format
                    if (inv.products && inv.products.length > 0) {
                        const mappedCart = inv.products.map(p => ({
                            _id: p.productId,
                            productName: p.productName,
                            quantity: p.qty,
                            printedQty: p.printedQty || 0,
                            addedInRound: p.addedInRound || 1,
                            price: p.rate,
                            vat: p.vat || 0,
                            sd: p.sd || 0,
                            cookStatus: p.cookStatus || 'PENDING',
                            isComplimentary: p.isComplimentary,
                            drinkBar: p.drinkBar || false,
                            history: p.history || []
                        }));
                        setAddedProducts(mappedCart);
                    }
                }
            } catch (err) {
                console.error("Error loading invoice for edit", err);
                toast.error("Could not load invoice for editing.");
            } finally {
                setIsProcessing(false);
            }
        };
        fetchInvoice();
    }, [invoiceId, axiosSecure]);

    // Handlers
    const handleMainPaymentButtonClick = (method) => {
        if (selectedPaymentMethod === method) {
            setSelectedPaymentMethod('');
            setSelectedSubMethod('');
            setSelectedCardIcon(null);
        } else {
            setSelectedPaymentMethod(method);
            setSelectedSubMethod('');
            if (method !== 'Card') {
                setSelectedCardIcon(null);
            }
        }
    };

    const handleSubPaymentButtonClick = (subMethod, iconComponent = null) => {
        setSelectedSubMethod(subMethod);
        setSelectedPaymentMethod(subMethod);
        if (subMethod.includes("Card")) {
            setSelectedCardIcon(iconComponent);
        } else {
            setSelectedCardIcon(null);
        }
    };

    const handleOrderTypeChange = (type) => {
        setOrderType(type);
        setTableName("");
        setRoomNo("");
        setDeliveryProvider("");
    };

    const handleCustomerSearch = async () => {
        if (!mobile) {
            Swal.fire("Error", "Please enter a mobile number.", "error");
            return;
        }
        if (!/^\d{11}$/.test(mobile)) {
            Swal.fire("Invalid Number", "Mobile number must be exactly 11 digits.", "warning");
            return;
        }

        try {
            const res = await axiosSecure.get(`/customer/paginated?search=${mobile}`);
            if (res.data?.customers && res.data.customers.length > 0) {
                setCustomer(res.data.customers[0]);
                toast.success("Guest found!");
            } else {
                setCustomer(null);
                setIsCustomerModalOpen(true);
            }
        } catch (e) {
            console.error(e);
            setIsCustomerModalOpen(true);
        }
    };

    const selectCustomer = (cust) => {
        setCustomer(cust);
        setMobile(cust.phoneNumber || cust.phone || "");
    };

    const addProduct = (food) => {
        setAddedProducts((prev) => {
            const existing = prev.find(p => p._id === food._id && !p.isComplimentary);
            if (existing) {
                return prev.map(p =>
                    p._id === food._id && !p.isComplimentary
                        ? { ...p, quantity: p.quantity + 1 }
                        : p
                );
            }
            return [...prev, {
                _id: food._id,
                productName: food.foodName || food.productName,
                quantity: 1,
                printedQty: 0,
                addedInRound: kotRound,
                price: food.price,
                vat: food.vat || 0,
                sd: food.sd || 0,
                cookStatus: 'PENDING',
                isComplimentary: false,
                drinkBar: food.category?.toLowerCase() === "drinks" || food.category?.toLowerCase() === "beverage" || food.drinkBar === true,
                history: []
            }];
        });
    };

    const incrementQuantity = (id) => {
        setAddedProducts(prev => prev.map(p => p._id === id ? { ...p, quantity: p.quantity + 1 } : p));
    };

    const decrementQuantity = (id) => {
        setAddedProducts(prev => prev.map(p => {
            if (p._id === id) {
                const newQty = p.quantity - 1;
                return newQty > 0 ? { ...p, quantity: newQty } : p;
            }
            return p;
        }));
    };

    const removeProduct = (id) => {
        setAddedProducts(prev => prev.filter(p => p._id !== id));
    };

    const toggleComplimentaryStatus = (id) => {
        setAddedProducts(prev => prev.map(p => p._id === id ? { ...p, isComplimentary: !p.isComplimentary } : p));
    };

    const roundAmount = (amt) => Math.round(amt * 100) / 100;

    // Totals calculations
    const totals = useMemo(() => {
        const nonComplimentary = addedProducts.filter(p => !p.isComplimentary);
        const subtotal = nonComplimentary.reduce((acc, p) => acc + p.price * p.quantity, 0);
        const vatVal = nonComplimentary.reduce((acc, p) => acc + (p.vat * p.quantity), 0);
        const sdVal = nonComplimentary.reduce((acc, p) => acc + (p.sd * p.quantity), 0);
        
        let discountAmount = 0;
        const discountInput = parseFloat(invoiceSummary.discount || 0);
        if (discountType === 'Percent') {
            discountAmount = ((subtotal + vatVal + sdVal) * discountInput) / 100;
        } else {
            discountAmount = discountInput;
        }

        const payable = subtotal + vatVal + sdVal - discountAmount;
        return {
            subtotal,
            vat: vatVal,
            sd: sdVal,
            discount: discountAmount,
            payable: roundAmount(payable)
        };
    }, [addedProducts, invoiceSummary.discount, discountType]);

    const change = (invoiceSummary.paid || 0) > totals.payable ? (invoiceSummary.paid || 0) - totals.payable : 0;

    // Print & Save Order
    const printInvoice = async (isPrintAction) => {
        if (addedProducts.length === 0) return;
        setIsProcessing(true);

        const invoiceDetails = {
            orderType,
            kotRound,
            products: addedProducts.map(p => ({
                productId: p._id,
                productName: p.productName,
                qty: p.quantity,
                printedQty: p.printedQty || p.quantity, // mark all as printed on final invoice checkout
                addedInRound: p.addedInRound || kotRound,
                rate: p.price,
                subtotal: roundAmount(p.price * p.quantity),
                vat: p.vat || 0,
                sd: p.sd || 0,
                cookStatus: p.cookStatus || 'PENDING',
                isComplimentary: p.isComplimentary,
                drinkBar: p.drinkBar,
                history: p.history?.length > 0 ? p.history : [{
                    updateNumber: 0,
                    updateTime: new Date().toISOString(),
                    cookStatus: p.cookStatus || 'PENDING',
                    qty: p.quantity
                }]
            })),
            subTotal: roundAmount(totals.subtotal),
            subtotal: roundAmount(totals.subtotal),
            discount: roundAmount(totals.discount),
            vat: roundAmount(totals.vat),
            sd: roundAmount(totals.sd),
            grandTotal: totals.payable,
            totalAmount: totals.payable,
            loginUserEmail,
            loginUserName,
            customerName: customer?.fullName || customer?.name || "Guest",
            customerMobile: mobile || "n/a",
            customer: {
                name: customer?.fullName || customer?.name || "Guest",
                phone: mobile || "n/a"
            },
            counter: "Counter 1",
            paymentMethod: isPrintAction ? (selectedPaymentMethod || "Cash") : "Due",
            paymentStatus: isPrintAction ? "Paid" : "Unpaid",
            invoiceType: "Restaurant",
            orderStatus: isPrintAction ? "served" : "Pending"
        };

        if (customDateTime) {
            invoiceDetails.dateTime = customDateTime;
            invoiceDetails.createdAt = customDateTime;
        }
        if (orderType === "dine-in") invoiceDetails.tableName = TableName;
        if (orderType === "delivery") invoiceDetails.deliveryProvider = deliveryProvider;
        if (orderType === "room service") invoiceDetails.roomNo = roomNo;

        try {
            let res;
            if (currentInvoiceId) {
                res = await axiosSecure.put(`/pos/invoice/${currentInvoiceId}`, invoiceDetails);
            } else {
                res = await axiosSecure.post("/pos/invoice", invoiceDetails);
            }

            if (res.data?.success) {
                toast.success("Order processed successfully!");
                const savedInvoice = {
                    ...invoiceDetails,
                    ...res.data.data,
                    invoiceSerial: res.data.data?.invoiceSerial || res.data.data?.invoiceNo || res.data.data?._id
                };

                if (isPrintAction && receiptRef.current) {
                    setPrintData(savedInvoice);
                    setTimeout(() => {
                        receiptRef.current.printReceipt();
                    }, 300);
                }

                // Reset
                setAddedProducts([]);
                setCustomer(null);
                setMobile("");
                setTableName("");
                setRoomNo("");
                setDeliveryProvider("");
                setCurrentInvoiceId(null);
                setKotRound(1);
            }
        } catch (e) {
            console.error("Order save failure", e);
            Swal.fire("Error", "Could not process the order. Please try again.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Kitchen Send (KOT)
    const handleKitchenClick = async () => {
        if (addedProducts.length === 0) {
            toast.warn("Please add products first.");
            return;
        }

        setIsProcessing(true);

        // Find items that need printing to Kitchen/Bar (qty > printedQty)
        const unprintedKitchenItems = addedProducts.filter(p => !p.drinkBar && p.quantity > (p.printedQty || 0));
        const unprintedBarItems = addedProducts.filter(p => p.drinkBar && p.quantity > (p.printedQty || 0));

        if (unprintedKitchenItems.length === 0 && unprintedBarItems.length === 0) {
            toast.info("All items have already been sent to the kitchen/bar.");
            setIsProcessing(false);
            return;
        }

        // Update local cart printed amounts
        const updatedProducts = addedProducts.map(p => ({
            ...p,
            printedQty: p.quantity,
            addedInRound: p.addedInRound || kotRound,
            // populate history
            history: p.history?.length > 0 ? p.history : [{
                updateNumber: 0,
                updateTime: new Date().toISOString(),
                cookStatus: p.cookStatus || 'PENDING',
                qty: p.quantity
            }]
        }));

        const invoiceDetails = {
            orderType,
            kotRound,
            products: updatedProducts.map(p => ({
                productId: p._id,
                productName: p.productName,
                qty: p.quantity,
                printedQty: p.quantity,
                addedInRound: p.addedInRound || kotRound,
                rate: p.price,
                subtotal: roundAmount(p.price * p.quantity),
                vat: p.vat || 0,
                sd: p.sd || 0,
                cookStatus: p.cookStatus || 'PENDING',
                isComplimentary: p.isComplimentary,
                drinkBar: p.drinkBar,
                history: p.history || []
            })),
            subTotal: roundAmount(totals.subtotal),
            subtotal: roundAmount(totals.subtotal),
            discount: roundAmount(totals.discount),
            vat: roundAmount(totals.vat),
            sd: roundAmount(totals.sd),
            grandTotal: totals.payable,
            totalAmount: totals.payable,
            loginUserEmail,
            loginUserName,
            customerName: customer?.fullName || customer?.name || "Guest",
            customerMobile: mobile || "n/a",
            customer: {
                name: customer?.fullName || customer?.name || "Guest",
                phone: mobile || "n/a"
            },
            counter: "Counter 1",
            paymentMethod: "Due",
            paymentStatus: "Unpaid",
            invoiceType: "Restaurant",
            orderStatus: "Pending"
        };

        if (orderType === "dine-in") invoiceDetails.tableName = TableName;
        if (orderType === "delivery") invoiceDetails.deliveryProvider = deliveryProvider;
        if (orderType === "room service") invoiceDetails.roomNo = roomNo;

        try {
            let res;
            if (currentInvoiceId) {
                res = await axiosSecure.put(`/pos/invoice/${currentInvoiceId}`, invoiceDetails);
            } else {
                res = await axiosSecure.post("/pos/invoice", invoiceDetails);
            }

            if (res.data?.success) {
                toast.success("Sent to kitchen board!");
                const savedInvoice = {
                    ...invoiceDetails,
                    ...res.data.data,
                    invoiceSerial: res.data.data?.invoiceSerial || res.data.data?.invoiceNo || res.data.data?._id
                };

                setCurrentInvoiceId(savedInvoice._id);
                setAddedProducts(updatedProducts);

                // Print Kitchen ticket if any
                if (unprintedKitchenItems.length > 0 && kitchenReceiptRef.current) {
                    setPrintKitchenData({
                        ...savedInvoice,
                        products: unprintedKitchenItems.map(p => ({ ...p, qty: p.quantity - (p.printedQty || 0) }))
                    });
                }

                // Print Bar ticket if any
                if (unprintedBarItems.length > 0 && barReceiptRef.current) {
                    setPrintBarData({
                        ...savedInvoice,
                        products: unprintedBarItems.map(p => ({ ...p, qty: p.quantity - (p.printedQty || 0) }))
                    });
                }

                // Increment Round for any additions
                setKotRound(prev => prev + 1);
            }
        } catch (e) {
            console.error("KOT save error", e);
            toast.error("Failed to send order to kitchen.");
        } finally {
            setIsProcessing(false);
        }
    };

    const resetOrder = () => {
        setAddedProducts([]);
        setCustomer(null);
        setMobile("");
        setTableName("");
        setRoomNo("");
        setDeliveryProvider("");
        setCurrentInvoiceId(null);
        setKotRound(1);
        setInvoiceSummary({ discount: 0, paid: 0 });
        toast.info("POS Order Reset!");
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 p-4 min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
            {/* Left: Product Selector */}
            <ProductSelection 
                products={foods}
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                addProduct={addProduct}
                loading={loadingProducts || loadingCategories}
                isProcessing={isProcessing}
                selectedPaymentMethod={selectedPaymentMethod}
                selectedSubMethod={selectedSubMethod}
                selectedCardIcon={selectedCardIcon}
                handleMainPaymentButtonClick={handleMainPaymentButtonClick}
                handleSubPaymentButtonClick={handleSubPaymentButtonClick}
            />

            {/* Right: Order Summary Details */}
            <OrderSummary 
                user={user}
                customDateTime={customDateTime}
                setCustomDateTime={setCustomDateTime}
                customer={customer}
                mobile={mobile}
                setMobile={setMobile}
                handleCustomerSearch={handleCustomerSearch}
                orderType={orderType}
                handleOrderTypeChange={handleOrderTypeChange}
                TableName={TableName}
                roomNo={roomNo}
                setRoomNo={setRoomNo}
                deliveryProvider={deliveryProvider}
                addedProducts={addedProducts}
                incrementQuantity={incrementQuantity}
                decrementQuantity={decrementQuantity}
                removeProduct={removeProduct}
                invoiceSummary={invoiceSummary}
                setInvoiceSummary={setInvoiceSummary}
                subtotal={totals.subtotal}
                vat={totals.vat}
                sd={totals.sd}
                payable={totals.payable}
                paid={invoiceSummary.paid}
                change={change}
                printInvoice={printInvoice}
                handleKitchenClick={handleKitchenClick}
                resetOrder={resetOrder}
                isProcessing={isProcessing}
                toggleComplimentaryStatus={toggleComplimentaryStatus}
                selectedPaymentMethod={selectedPaymentMethod}
                selectedSubMethod={selectedSubMethod}
                discountType={discountType}
                setDiscountType={setDiscountType}
                tables={tables}
                rooms={rooms}
                TableNameState={TableName}
                setTableNameState={setTableName}
                deliveryProviderState={deliveryProvider}
                setDeliveryProviderState={setDeliveryProvider}
            />

            {/* Customer Add Modal */}
            <CustomerModal 
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSuccess={(newCustomer) => {
                    selectCustomer(newCustomer);
                    setIsCustomerModalOpen(false);
                }}
            />

            {/* Print Render Containers (Invisible to user) */}
            <div className="hidden">
                {printData && (
                    <ReceiptTemplate 
                        ref={receiptRef}
                        profileData={companyInfo}
                        invoiceData={printData}
                        onPrintComplete={() => setPrintData(null)}
                    />
                )}
                {printKitchenData && (
                    <KitchenReceiptTemplate 
                        ref={kitchenReceiptRef}
                        profileData={companyInfo}
                        invoiceData={printKitchenData}
                        onPrintComplete={() => setPrintKitchenData(null)}
                    />
                )}
                {printBarData && (
                    <BarReceiptTemplate 
                        ref={barReceiptRef}
                        profileData={companyInfo}
                        invoiceData={printBarData}
                        onPrintComplete={() => setPrintBarData(null)}
                    />
                )}
            </div>
        </div>
    );
}

export default function POSPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] w-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <POSContent />
        </Suspense>
    );
}
