"use client";

import React, { useState, useEffect, useContext, useRef, useMemo, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import usePagePermission from "@/hooks/usePagePermission";
import { FaUtensils, FaGift, FaTruck, FaHotel, FaLock, FaMoneyBillWave, FaCheck, FaPrint, FaUniversity } from "react-icons/fa";
import { FaCcVisa, FaCcAmex } from "react-icons/fa6";
import { RiMastercardFill } from "react-icons/ri";
import { FiX } from "react-icons/fi";

function POSContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const invoiceId = searchParams.get("invoiceId");

    const { user } = useContext(AuthContext);
    const { canAdd, canEdit } = usePagePermission();
    const loginUserEmail = user?.email || "info@chayatolresort.com";
    const loginUserName = user?.name || "Server Staff";

    const axiosSecure = useAxiosSecure();

    // Data-fetching hooks
    const { foods, isLoading: loadingProducts } = useFood(1, 1000);
    const { categories, isLoading: loadingCategories } = useFoodCategories(1, 100);

    // POS States
    const [selectedCategory, setSelectedCategory] = useState("");

    // Auto-select first category on load to prevent rendering all foods at once
    useEffect(() => {
        if (categories && categories.length > 0 && !selectedCategory) {
            const firstCat = typeof categories[0] === 'object' ? categories[0].categoryName : categories[0];
            if (firstCat) {
                Promise.resolve().then(() => {
                    setSelectedCategory(firstCat);
                });
            }
        }
    }, [categories, selectedCategory]);
    const [addedProducts, setAddedProducts] = useState([]);
    const [orderType, setOrderType] = useState("");
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

    // Dynamic POS settings & customers states
    const [chargeSettings, setChargeSettings] = useState(null);
    const [paymentTypes, setPaymentTypes] = useState([]);
    const [custSearchResults, setCustSearchResults] = useState([]);
    const [custSearchLoading, setCustSearchLoading] = useState(false);
    const [isOrderTypeModalOpen, setIsOrderTypeModalOpen] = useState(false);
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [activeStays, setActiveStays] = useState([]);

    // Checkout modal states
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState("action"); // "action" or "payment"
    const [checkoutMode, setCheckoutMode] = useState(""); // "print-bill", "pay-and-print", "collect-only"

    const handlePayAndPrintClick = () => {
        if (addedProducts.length === 0) {
            toast.warn("Please add products to the cart first.");
            return;
        }
        setIsCheckoutModalOpen(true);
        setCheckoutStep("action");
    };

    // Auxiliary Data (Tables, Rooms, Company info)
    const [tables, setTables] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
    const [reloadCounter, setReloadCounter] = useState(0);
    const [idempotencyKey, setIdempotencyKey] = useState("");
    const generateIdempotencyKey = () => {
        return "pos-" + Date.now() + "-" + Math.random().toString(36).substring(2, 15);
    };

    useEffect(() => {
        setIdempotencyKey(generateIdempotencyKey());
    }, []);

    // Customer & Modals
    const [mobile, setMobile] = useState("");
    const [customer, setCustomer] = useState(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    // Print Refs & States
    const receiptRef = useRef();
    const kitchenReceiptRef = useRef();
    const [printData, setPrintData] = useState(null);

    // KOT Queue: array of { kitchenName, invoiceData } printed one by one
    const [kotQueue, setKotQueue] = useState([]);
    const [currentKot, setCurrentKot] = useState(null); // what's currently printing
    const [printKOTEnabled, setPrintKOTEnabled] = useState(true); // from /settings/controls
    // Holds KOTs that should start AFTER customer receipt finishes (Pay & Print flow)
    const pendingKotQueueRef = useRef([]);

    // Auto-trigger thermal print when printData is set (Pay & Print flow)
    useEffect(() => {
        if (!printData) return;
        // Allow React to re-render with ReceiptTemplate mounted, then print
        const timer = setTimeout(() => {
            if (receiptRef.current) {
                receiptRef.current.printReceipt();
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [printData]);

    // KOT Queue processor — feeds queue into currentKot one at a time
    useEffect(() => {
        if (currentKot) return; // already printing, wait for onPrintComplete
        if (kotQueue.length === 0) return;
        const [next, ...rest] = kotQueue;
        setCurrentKot(next);
        setKotQueue(rest);
    }, [kotQueue, currentKot]);

    // Fetch auxiliary data
    useEffect(() => {
        const fetchAuxData = async () => {
            try {
                const [tablesRes, roomsRes, companyRes, paymentRes, chargesRes, staysRes, controlRes] = await Promise.all([
                    axiosSecure.get("/restauranttable/status").catch((err) => { console.error("POS tables error:", err); return { data: [] }; }),
                    axiosSecure.get("/room?all=true").catch((err) => { console.error("POS rooms error:", err); return { data: [] }; }),
                    axiosSecure.get("/company").catch((err) => { console.error("POS company error:", err); return { data: [] }; }),
                    axiosSecure.get("/paymenttype").catch((err) => { console.error("POS paymenttype error:", err); return { data: [] }; }),
                    axiosSecure.get("/settings/charges").catch((err) => { console.error("POS charges error:", err); return { data: null }; }),
                    axiosSecure.get("/stays?status=In House&limit=1000").catch((err) => { console.error("POS stays error:", err); return { data: { data: [] } }; }),
                    axiosSecure.get("/settings/controls").catch((err) => { console.error("POS controls error:", err); return { data: { printKOT: true } }; }),
                ]);

                if (tablesRes.data) setTables(tablesRes.data);
                if (roomsRes.data) {
                    setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : (roomsRes.data.data || []));
                }
                if (companyRes.data && companyRes.data.length > 0) {
                    setCompanyInfo(companyRes.data[0]);
                }
                if (paymentRes.data) {
                    setPaymentTypes(paymentRes.data);
                }
                if (chargesRes && chargesRes.data) {
                    setChargeSettings(chargesRes.data);
                }
                if (staysRes.data && staysRes.data.data) {
                    setActiveStays(staysRes.data.data);
                }
                if (controlRes?.data) {
                    setPrintKOTEnabled(controlRes.data.printKOT !== false);
                }
            } catch (e) {
                console.error("Auxiliary fetch failed", e);
            }
        };
        fetchAuxData();
    }, [axiosSecure]);

    const refreshTableStatuses = useCallback(async () => {
        try {
            const res = await axiosSecure.get("/restauranttable/status");
            if (res.data) setTables(res.data);
        } catch (err) {
            console.error("Error refreshing table statuses:", err);
        }
    }, [axiosSecure]);

    useEffect(() => {
        if (isTableModalOpen) {
            refreshTableStatuses();
        }
    }, [isTableModalOpen, refreshTableStatuses]);

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
                    const normalizeOrderTypeForClient = (type) => {
                        if (!type) return "dine-in";
                        const t = type.toLowerCase().trim();
                        if (t === "dine in" || t === "dine-in") return "dine-in";
                        if (t === "room service" || t === "roomservice") return "room service";
                        return t;
                    };
                    setOrderType(normalizeOrderTypeForClient(inv.orderType));
                    setTableName(inv.tableName || inv.tableNo || "");
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
                // Clear the invoiceId query param from URL so that navigating away and back doesn't reload this order
                router.replace("/dashboard/pos");
            } catch (err) {
                console.error("Error loading invoice for edit", err);
                toast.error("Could not load invoice for editing.");
                router.replace("/dashboard/pos");
            } finally {
                setIsProcessing(false);
            }
        };
        fetchInvoice();
    }, [invoiceId, axiosSecure, reloadCounter, router]);

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
        if (type === 'dine-in') {
            setIsTableModalOpen(true);
        } else if (type === 'delivery') {
            setIsDeliveryModalOpen(true);
        } else if (type === 'room service') {
            setIsRoomModalOpen(true);
        }
    };

    // Prompt for Order Type Modal on Mount / Reset
    useEffect(() => {
        Promise.resolve().then(() => {
            if (!orderType && !invoiceId) {
                setIsOrderTypeModalOpen(true);
            } else {
                setIsOrderTypeModalOpen(false);
            }
        });
    }, [orderType, invoiceId]);

    const handleCustomerSearch = async () => {
        if (!mobile || mobile.trim().length < 3) {
            Swal.fire("Error", "Please enter at least 3 digits to search.", "warning");
            return;
        }
        setCustSearchLoading(true);
        setCustSearchResults([]);
        try {
            const res = await axiosSecure.get(`/customer/paginated?search=${encodeURIComponent(mobile)}&limit=5`);
            if (res.data?.customers && res.data.customers.length > 0) {
                setCustSearchResults(res.data.customers);
            } else {
                setCustSearchResults([]);
                setIsCustomerModalOpen(true);
            }
        } catch (e) {
            console.error("Search customer error:", e);
        } finally {
            setCustSearchLoading(false);
        }
    };

    const selectCustomer = (cust) => {
        setCustomer(cust);
        setMobile(cust.fullName || cust.name || "");
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
                sc: food.sc || 0,
                cookStatus: 'PENDING',
                isComplimentary: false,
                drinkBar: food.category?.toLowerCase() === "drinks" || food.category?.toLowerCase() === "beverage" || food.drinkBar === true,
                cookOn: food.cookOn || (food.category?.toLowerCase() === "juice" ? "JUICE BAR" : "MAIN KITCHEN"),
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

        const getApplicabilityKey = (type, provider) => {
            if (!type) return "Dine In";
            const t = type.toLowerCase();
            if (t === "dine-in") return "Dine In";
            if (t === "takeaway") return "Takeaway";
            if (t === "room service") return "Room Service";
            if (t === "delivery") {
                if (provider) {
                    const p = provider.toLowerCase();
                    if (p.includes("foodpanda")) return "Foodpanda";
                    if (p.includes("foodi")) return "Foodi";
                    if (p.includes("pathao")) return "Pathao";
                }
                return "Delivery";
            }
            return "Dine In";
        };

        const appKey = getApplicabilityKey(orderType, deliveryProvider);

        let vatVal = 0;
        let sdVal = 0;
        let scVal = 0;

        nonComplimentary.forEach(p => {
            // VAT
            let vatPercent = 0;
            if (p.vat > 0 && chargeSettings?.vat?.enabled) {
                const isApplicable = chargeSettings.vat.customApplicability
                    ? !!chargeSettings.vat.applicability?.[appKey]
                    : true;
                if (isApplicable) {
                    vatPercent = chargeSettings.vat.value || 0;
                }
            }
            vatVal += (p.price * p.quantity * vatPercent) / 100;

            // SD
            let sdPercent = 0;
            if (p.sd > 0 && chargeSettings?.sd?.enabled) {
                const isApplicable = chargeSettings.sd.customApplicability
                    ? !!chargeSettings.sd.applicability?.[appKey]
                    : true;
                if (isApplicable) {
                    sdPercent = chargeSettings.sd.value || 0;
                }
            }
            sdVal += (p.price * p.quantity * sdPercent) / 100;

            // SC
            let scPercent = 0;
            if (p.sc > 0 && chargeSettings?.sc?.enabled) {
                const isApplicable = chargeSettings.sc.customApplicability
                    ? !!chargeSettings.sc.applicability?.[appKey]
                    : true;
                if (isApplicable) {
                    scPercent = chargeSettings.sc.value || 0;
                }
            }
            scVal += (p.price * p.quantity * scPercent) / 100;
        });

        let deliveryChargeVal = 0;
        const isSelfDelivery = deliveryProvider?.toLowerCase() === 'self delivery' || deliveryProvider?.toLowerCase() === 'self-delivery';
        if (orderType?.toLowerCase() === 'delivery' && isSelfDelivery && chargeSettings?.deliveryCharge) {
            if (chargeSettings.deliveryCharge.type === 'PERCENT') {
                deliveryChargeVal = (subtotal * (chargeSettings.deliveryCharge.value || 0)) / 100;
            } else {
                deliveryChargeVal = chargeSettings.deliveryCharge.value || 0;
            }
        }

        let discountAmount = 0;
        const discountInput = parseFloat(invoiceSummary.discount || 0);
        if (discountType === 'Percent') {
            discountAmount = ((subtotal + vatVal + sdVal + scVal) * discountInput) / 100;
        } else {
            discountAmount = discountInput;
        }

        const payable = subtotal + vatVal + sdVal + scVal + deliveryChargeVal - discountAmount;
        return {
            subtotal,
            vat: vatVal,
            sd: sdVal,
            sc: scVal,
            deliveryCharge: deliveryChargeVal,
            discount: discountAmount,
            payable: roundAmount(payable)
        };
    }, [addedProducts, invoiceSummary.discount, discountType, orderType, deliveryProvider, chargeSettings]);

    const change = (invoiceSummary.paid || 0) > totals.payable ? (invoiceSummary.paid || 0) - totals.payable : 0;

    // Print & Save Order
    const printInvoice = async (isPrintAction, checkoutModeOverride, paymentMethodOverride) => {
        if (isProcessing) return;
        if (addedProducts.length === 0) return;

        if (currentInvoiceId) {
            if (!canEdit) {
                Swal.fire("Restricted", "You do not have permission to edit orders.", "warning");
                return;
            }
        } else {
            if (!canAdd) {
                Swal.fire("Restricted", "You do not have permission to place new orders.", "warning");
                return;
            }
        }

        setIsProcessing(true);

        let finalPaymentMethod = isPrintAction ? (selectedPaymentMethod || "Cash") : "Due";
        let finalPaymentStatus = isPrintAction ? "Paid" : "Unpaid";
        let finalOrderStatus = isPrintAction ? "served" : "Pending";

        if (checkoutModeOverride) {
            if (checkoutModeOverride === 'print-bill') {
                finalPaymentMethod = "Due";
                finalPaymentStatus = "Unpaid";
                finalOrderStatus = "Pending";
            } else {
                finalPaymentMethod = paymentMethodOverride || selectedPaymentMethod || "Cash";
                finalPaymentStatus = "Paid";
                finalOrderStatus = "served";
            }
        }

        if (roomNo && checkoutModeOverride !== 'print-bill') {
            const result = await Swal.fire({
                title: 'Room Guest Payment Options',
                text: `How would you like to settle the order for Room ${roomNo}?`,
                icon: 'question',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: 'Add to Room Bill',
                denyButtonText: 'Pay Now',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#28a745',
                denyButtonColor: '#007bff',
                cancelButtonColor: '#6c757d',
            });

            if (result.isConfirmed) {
                // Add to Room Bill
                finalPaymentMethod = "Room Bill";
                finalPaymentStatus = "Unpaid";
            } else if (result.isDenied) {
                // Pay Now
                finalPaymentMethod = paymentMethodOverride || selectedPaymentMethod || "Cash";
                finalPaymentStatus = "Paid";
            } else {
                // Cancelled
                setIsProcessing(false);
                return;
            }
        }

        const invoiceDetails = {
            orderType,
            kotRound,
            idempotencyKey,
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
                cookOn: p.cookOn || "MAIN KITCHEN",
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
            sc: roundAmount(totals.sc),
            serviceCharge: roundAmount(totals.sc),
            deliveryCharge: roundAmount(totals.deliveryCharge || 0),
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
            paymentMethod: finalPaymentMethod,
            paymentStatus: finalPaymentStatus,
            invoiceType: "Restaurant",
            orderStatus: finalOrderStatus
        };

        if (customDateTime) {
            invoiceDetails.dateTime = customDateTime;
            invoiceDetails.createdAt = customDateTime;
        }
        const normalizedType = orderType?.toLowerCase();
        if (normalizedType === "dine-in") {
            invoiceDetails.tableName = TableName;
            invoiceDetails.tableNo = TableName;
        }
        if (normalizedType === "delivery") invoiceDetails.deliveryProvider = deliveryProvider;
        if (roomNo) invoiceDetails.roomNo = roomNo;

        try {
            let res;
            if (currentInvoiceId) {
                res = await axiosSecure.put(`/pos/invoice/${currentInvoiceId}`, invoiceDetails);
            } else {
                res = await axiosSecure.post("/pos/invoice", invoiceDetails);
            }

            if (res.data?.success) {
                toast.success("Order processed successfully!");
                setIdempotencyKey(generateIdempotencyKey());
                const savedInvoice = {
                    ...invoiceDetails,
                    ...res.data.data,
                    invoiceSerial: res.data.data?.invoiceSerial || res.data.data?.invoiceNo || res.data.data?._id
                };

                if (isPrintAction) {
                    // Build per-kitchen KOT queue BEFORE resetting cart
                    if (printKOTEnabled && addedProducts.length > 0) {
                        const kitchenMap = {};
                        addedProducts.forEach(p => {
                            const kitchen = (p.cookOn || "MAIN KITCHEN").toUpperCase();
                            if (!kitchenMap[kitchen]) kitchenMap[kitchen] = [];
                            kitchenMap[kitchen].push({ ...p, qty: p.quantity });
                        });
                        // Store in ref — will be flushed when customer receipt onPrintComplete fires
                        pendingKotQueueRef.current = Object.entries(kitchenMap).map(([kitchen, items]) => ({
                            kitchenName: kitchen,
                            invoiceData: {
                                ...savedInvoice,
                                kitchenName: kitchen,
                                kotRound,
                                products: items,
                            }
                        }));
                    }
                    setPrintData(savedInvoice);
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

    // Kitchen Send (KOT) — groups items by cookOn kitchen, prints one KOT per kitchen
    const handleKitchenClick = async () => {
        if (isProcessing) return;
        if (addedProducts.length === 0) {
            toast.warn("Please add products first.");
            return;
        }

        if (currentInvoiceId) {
            if (!canEdit) {
                Swal.fire("Restricted", "You do not have permission to edit orders.", "warning");
                return;
            }
        } else {
            if (!canAdd) {
                Swal.fire("Restricted", "You do not have permission to place new orders.", "warning");
                return;
            }
        }

        setIsProcessing(true);

        // Find items that haven't been fully printed yet (qty > printedQty)
        const unprintedItems = addedProducts.filter(p => p.quantity > (p.printedQty || 0));

        if (unprintedItems.length === 0) {
            toast.info("All items have already been sent to the kitchen.");
            setIsProcessing(false);
            return;
        }

        // Update local cart: mark all as printed
        const updatedProducts = addedProducts.map(p => ({
            ...p,
            printedQty: p.quantity,
            addedInRound: p.addedInRound || kotRound,
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
            idempotencyKey,
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
                cookOn: p.cookOn || "MAIN KITCHEN",
                history: p.history || []
            })),
            subTotal: roundAmount(totals.subtotal),
            subtotal: roundAmount(totals.subtotal),
            discount: roundAmount(totals.discount),
            vat: roundAmount(totals.vat),
            sd: roundAmount(totals.sd),
            sc: roundAmount(totals.sc),
            grandTotal: totals.payable,
            totalAmount: totals.payable,
            loginUserEmail,
            loginUserName,
            customerName: customer?.fullName || customer?.name || "Guest",
            customerMobile: mobile || "n/a",
            customer: { name: customer?.fullName || customer?.name || "Guest", phone: mobile || "n/a" },
            counter: "Counter 1",
            paymentMethod: "Due",
            paymentStatus: "Unpaid",
            invoiceType: "Restaurant",
            orderStatus: "Pending"
        };

        const normalizedType = orderType?.toLowerCase();
        if (normalizedType === "dine-in") {
            invoiceDetails.tableName = TableName;
            invoiceDetails.tableNo = TableName;
        }
        if (normalizedType === "delivery") invoiceDetails.deliveryProvider = deliveryProvider;
        if (roomNo) invoiceDetails.roomNo = roomNo;

        try {
            let res;
            if (currentInvoiceId) {
                res = await axiosSecure.put(`/pos/invoice/${currentInvoiceId}`, invoiceDetails);
            } else {
                res = await axiosSecure.post("/pos/invoice", invoiceDetails);
            }

            if (res.data?.success) {
                toast.success("Order sent to kitchen!");
                setIdempotencyKey(generateIdempotencyKey());
                const savedInvoice = {
                    ...invoiceDetails,
                    ...res.data.data,
                    invoiceSerial: res.data.data?.invoiceSerial || res.data.data?.invoiceNo || res.data.data?._id
                };

                setCurrentInvoiceId(savedInvoice._id);
                setAddedProducts(updatedProducts);
                setKotRound(prev => prev + 1);

                // --- Build per-kitchen KOT queue (same mechanism as Pay & Print) ---
                if (printKOTEnabled) {
                    const kitchenMap = {};
                    unprintedItems.forEach(p => {
                        const kitchen = (p.cookOn || "MAIN KITCHEN").toUpperCase();
                        if (!kitchenMap[kitchen]) kitchenMap[kitchen] = [];
                        kitchenMap[kitchen].push({ ...p, qty: p.quantity - (p.printedQty || 0) });
                    });

                    const newQueue = Object.entries(kitchenMap).map(([kitchen, items]) => ({
                        kitchenName: kitchen,
                        invoiceData: {
                            ...savedInvoice,
                            kitchenName: kitchen,
                            kotRound,
                            products: items,
                        }
                    }));

                    // Flush immediately — no delay, prints as soon as React renders the component
                    setKotQueue(q => [...q, ...newQueue]);
                }
            }
        } catch (e) {
            console.error("KOT save error", e);
            toast.error("Failed to send order to kitchen.");
        } finally {
            setIsProcessing(false);
        }
    };

    const resetOrder = () => {
        router.push("/dashboard/pos");
        setIdempotencyKey(generateIdempotencyKey());
        setAddedProducts([]);
        setCustomer(null);
        setMobile("");
        setTableName("");
        setRoomNo("");
        setDeliveryProvider("");
        setCurrentInvoiceId(null);
        setKotRound(1);
        setInvoiceSummary({ discount: 0, paid: 0 });
        setOrderType("");
        setIsTableModalOpen(false);
        setIsDeliveryModalOpen(false);
        setIsRoomModalOpen(false);
        if (categories && categories.length > 0) {
            const firstCat = typeof categories[0] === 'object' ? categories[0].categoryName : categories[0];
            setSelectedCategory(firstCat || "All");
        } else {
            setSelectedCategory("All");
        }
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
                paymentTypes={paymentTypes}
            />

            {/* Right: Order Summary Details */}
            <OrderSummary
                user={user}
                canAdd={canAdd}
                canEdit={canEdit}
                isEditing={!!currentInvoiceId}
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
                sc={totals.sc}
                deliveryCharge={totals.deliveryCharge}
                payable={totals.payable}
                paid={invoiceSummary.paid}
                change={change}
                printInvoice={handlePayAndPrintClick}
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
                activeStays={activeStays}
                TableNameState={TableName}
                setTableNameState={setTableName}
                deliveryProviderState={deliveryProvider}
                setDeliveryProviderState={setDeliveryProvider}
                custSearchResults={custSearchResults}
                setCustSearchResults={setCustSearchResults}
                custSearchLoading={custSearchLoading}
                setIsCustomerModalOpen={setIsCustomerModalOpen}
                setCustomer={setCustomer}
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

            {/* Order Type Selection Modal */}
            {isOrderTypeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-w-md w-full border border-brand-beige/25 dark:border-zinc-850 animate-scale-in mx-4">
                        <h3 className="text-xl font-extrabold text-center text-gray-800 dark:text-zinc-100 uppercase tracking-widest mb-6">
                            Select Order Type
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { value: "dine-in", label: "Dine In", icon: <FaUtensils size={20} /> },
                                { value: "takeaway", label: "Takeaway", icon: <FaGift size={20} /> },
                                { value: "delivery", label: "Delivery", icon: <FaTruck size={20} /> },
                                { value: "room service", label: "Room Service", icon: <FaHotel size={20} /> }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        handleOrderTypeChange(option.value);
                                        setIsOrderTypeModalOpen(false);
                                    }}
                                    className="flex flex-col items-center justify-center p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 hover:bg-brand-primary/10 hover:border-brand-primary dark:bg-zinc-800 dark:hover:bg-brand-primary/20 dark:hover:border-brand-primary text-gray-700 dark:text-zinc-300 cursor-pointer transition-all hover:scale-105 group"
                                >
                                    <div className="text-brand-primary dark:text-brand-sage group-hover:scale-110 transition-transform duration-200 mb-2">
                                        {option.icon}
                                    </div>
                                    <span className="text-sm font-bold">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Table Selection Modal */}
            {isTableModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-w-lg w-full border border-brand-beige/25 dark:border-zinc-850 animate-scale-in mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-extrabold text-gray-800 dark:text-zinc-100 uppercase tracking-widest">
                                Select Dine-In Table
                            </h3>
                            <button
                                onClick={() => setIsTableModalOpen(false)}
                                className="text-gray-450 hover:text-gray-600 dark:hover:text-zinc-350 font-bold text-sm cursor-pointer"
                            >
                                Close
                            </button>
                        </div>

                        {tables && tables.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                                {tables.map((table) => {
                                    const isSelected = TableName === table.tableName;
                                    const isOccupied = ['pending', 'cooking', 'served'].includes(table.status) && table.tableName !== TableName;
                                    const isReserved = table.status === 'reserved';
                                    return (
                                        <button
                                            key={table._id}
                                            disabled={isOccupied}
                                            onClick={() => {
                                                setTableName(table.tableName);
                                                setIsTableModalOpen(false);
                                            }}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 relative
                                                ${isSelected
                                                    ? "bg-brand-primary border-brand-primary text-white cursor-pointer"
                                                    : isOccupied
                                                        ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-400 dark:text-red-500/70 cursor-not-allowed opacity-75"
                                                        : "border-gray-200 dark:border-zinc-800 bg-gray-50 hover:bg-brand-primary/10 hover:border-brand-primary dark:bg-zinc-800 dark:hover:bg-brand-primary/20 dark:hover:border-brand-primary text-gray-700 dark:text-zinc-300 cursor-pointer"}`}
                                        >
                                            {isOccupied ? (
                                                <FaLock size={15} className="text-red-500 dark:text-red-400" />
                                            ) : (
                                                <FaUtensils size={15} className={isSelected ? "text-white" : "text-brand-primary dark:text-brand-sage"} />
                                            )}
                                            <span className="text-xs font-bold text-center leading-tight">{table.tableName}</span>

                                            {isOccupied && (
                                                <span className="text-[8px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1 py-0.5 rounded font-extrabold uppercase scale-90">
                                                    Occupied
                                                </span>
                                            )}
                                            {isReserved && !isOccupied && (
                                                <span className="text-[8px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-extrabold uppercase scale-90">
                                                    Reserved
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 dark:text-zinc-400">
                                No restaurant tables configured.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delivery Provider Selection Modal */}
            {isDeliveryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-w-md w-full border border-brand-beige/25 dark:border-zinc-850 animate-scale-in mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-extrabold text-gray-800 dark:text-zinc-100 uppercase tracking-widest">
                                Select Delivery Provider
                            </h3>
                            <button
                                onClick={() => setIsDeliveryModalOpen(false)}
                                className="text-gray-450 hover:text-gray-600 dark:hover:text-zinc-350 font-bold text-sm cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { value: "Foodpanda", label: "Foodpanda" },
                                { value: "Foodi", label: "Foodi" },
                                { value: "Pathao", label: "Pathao" },
                                { value: "Self Delivery", label: "Self Delivery" }
                            ].map((provider) => {
                                const isSelected = deliveryProvider === provider.value;
                                return (
                                    <button
                                        key={provider.value}
                                        onClick={() => {
                                            setDeliveryProvider(provider.value);
                                            setIsDeliveryModalOpen(false);
                                        }}
                                        className={`p-5 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105
                                            ${isSelected
                                                ? "bg-brand-primary border-brand-primary text-white"
                                                : "border-gray-200 dark:border-zinc-800 bg-gray-50 hover:bg-brand-primary/10 hover:border-brand-primary dark:bg-zinc-800 dark:hover:bg-brand-primary/20 dark:hover:border-brand-primary text-gray-700 dark:text-zinc-300"}`}
                                    >
                                        <span className="text-sm font-bold text-center leading-tight">{provider.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Room Selection Modal */}
            {isRoomModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-w-lg w-full border border-brand-beige/25 dark:border-zinc-850 animate-scale-in mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-extrabold text-gray-800 dark:text-zinc-100 uppercase tracking-widest">
                                Select Guest Room
                            </h3>
                            <button
                                onClick={() => setIsRoomModalOpen(false)}
                                className="text-gray-450 hover:text-gray-600 dark:hover:text-zinc-350 font-bold text-sm cursor-pointer"
                            >
                                Close
                            </button>
                        </div>

                        {(() => {
                            const occupiedRoomNumbers = activeStays.map(s => s.rooms?.map(sr => sr.room?.roomNumber)).flat().filter(Boolean);

                            const displayedRooms = orderType?.toLowerCase() === 'room service'
                                ? rooms.filter(r => occupiedRoomNumbers.includes(r.roomNumber))
                                : rooms;

                            if (displayedRooms.length === 0) {
                                return (
                                    <div className="text-center py-6 text-gray-500 dark:text-zinc-400">
                                        {orderType?.toLowerCase() === 'room service'
                                            ? "No occupied guest rooms found for room service."
                                            : "No guest rooms configured."}
                                    </div>
                                );
                            }

                            return (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                                    {displayedRooms.map((r) => {
                                        const isSelected = roomNo === r.roomNumber;
                                        return (
                                            <button
                                                key={r._id}
                                                onClick={() => {
                                                    setRoomNo(r.roomNumber);
                                                    setIsRoomModalOpen(false);

                                                    // Automatically select the active guest staying in this room
                                                    if (orderType?.toLowerCase() === 'room service') {
                                                        const associatedStay = activeStays.find(s => s.rooms?.some(sr => sr.room?.roomNumber === r.roomNumber));
                                                        if (associatedStay && associatedStay.customer) {
                                                            selectCustomer(associatedStay.customer);
                                                            toast.success(`Guest auto-selected: ${associatedStay.customer.fullName || associatedStay.customer.name}`);
                                                        }
                                                    }
                                                }}
                                                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105
                                                    ${isSelected
                                                        ? "bg-brand-primary border-brand-primary text-white"
                                                        : "border-gray-200 dark:border-zinc-800 bg-gray-50 hover:bg-brand-primary/10 hover:border-brand-primary dark:bg-zinc-800 dark:hover:bg-brand-primary/20 dark:hover:border-brand-primary text-gray-700 dark:text-zinc-300"}`}
                                            >
                                                <span className="text-xs font-bold text-center leading-tight">Room {r.roomNumber}</span>
                                                <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-gray-450 dark:text-gray-400"}`}>
                                                    {r.type || "Standard"}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Checkout Action Modal */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-w-md w-full border border-brand-beige/25 dark:border-zinc-850 animate-scale-in mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-extrabold text-gray-800 dark:text-zinc-100 uppercase tracking-widest">
                                Checkout Options
                            </h3>
                            <button
                                onClick={() => setIsCheckoutModalOpen(false)}
                                className="text-gray-450 hover:text-gray-600 dark:hover:text-zinc-350 font-bold text-sm cursor-pointer"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {checkoutStep === "action" ? (
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => {
                                        setIsCheckoutModalOpen(false);
                                        printInvoice(true, "print-bill", "Due");
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/35 transition-all text-left cursor-pointer group"
                                >
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform duration-200">
                                        <FaPrint size={20} />
                                    </div>
                                    <div>
                                        <span className="block font-bold text-gray-850 dark:text-zinc-100 text-sm">Print Customer Bill</span>
                                        <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Hold order as Unpaid/Due and print preliminary bill.</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        setCheckoutMode("pay-and-print");
                                        setCheckoutStep("payment");
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/35 transition-all text-left cursor-pointer group"
                                >
                                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform duration-200">
                                        <FaMoneyBillWave size={20} />
                                    </div>
                                    <div>
                                        <span className="block font-bold text-gray-850 dark:text-zinc-100 text-sm">Pay Bill & Get Payment (Print)</span>
                                        <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Settle order as Paid and print final receipt.</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        setCheckoutMode("collect-only");
                                        setCheckoutStep("payment");
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/35 transition-all text-left cursor-pointer group"
                                >
                                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform duration-200">
                                        <FaCheck size={20} />
                                    </div>
                                    <div>
                                        <span className="block font-bold text-gray-850 dark:text-zinc-100 text-sm">Collect Only Payment (No Print)</span>
                                        <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Settle order as Paid without printing a physical receipt.</span>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div>
                                <h4 className="text-sm font-bold text-gray-500 dark:text-zinc-400 mb-4">
                                    Select Payment Method:
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {(() => {
                                        const options = [];
                                        const hasCash = paymentTypes.some(pt => pt.name === "Cash");
                                        const hasCard = paymentTypes.some(pt => pt.name === "Card");
                                        const hasMobile = paymentTypes.some(pt => pt.name === "Mobile");
                                        const hasBank = paymentTypes.some(pt => pt.name === "Bank");
                                        const useFallback = !paymentTypes || paymentTypes.length === 0;

                                        if (hasCash || useFallback) {
                                            options.push({ name: "Cash", method: "Cash", sub: "", icon: <FaMoneyBillWave size={16} /> });
                                        }
                                        if (hasCard || useFallback) {
                                            options.push({ name: "Visa Card", method: "Card", sub: "Visa Card", icon: <FaCcVisa size={16} /> });
                                            options.push({ name: "Master Card", method: "Card", sub: "Master Card", icon: <RiMastercardFill size={16} /> });
                                            options.push({ name: "Amex Card", method: "Card", sub: "Amex Card", icon: <FaCcAmex size={16} /> });
                                        }
                                        if (hasMobile || useFallback) {
                                            options.push({ name: "Bkash", method: "Mobile", sub: "Bkash", icon: <span className="font-extrabold text-[10px] text-pink-600">bKash</span> });
                                            options.push({ name: "Nagad", method: "Mobile", sub: "Nagad", icon: <span className="font-extrabold text-[10px] text-orange-600">Nagad</span> });
                                            options.push({ name: "Rocket", method: "Mobile", sub: "Rocket", icon: <span className="font-extrabold text-[10px] text-purple-600">Rocket</span> });
                                        }
                                        if (hasBank || useFallback) {
                                            options.push({ name: "Bank", method: "Bank", sub: "", icon: <FaUniversity size={16} /> });
                                        }

                                        paymentTypes.forEach(pt => {
                                            if (!["Cash", "Card", "Mobile", "Bank"].includes(pt.name)) {
                                                options.push({ name: pt.name, method: pt.name, sub: "", icon: <FaUniversity size={16} /> });
                                            }
                                        });

                                        return options.map((opt) => (
                                            <button
                                                key={opt.name}
                                                onClick={() => {
                                                    setIsCheckoutModalOpen(false);
                                                    printInvoice(
                                                        checkoutMode === "pay-and-print",
                                                        checkoutMode,
                                                        opt.sub || opt.method
                                                    );
                                                }}
                                                className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 hover:bg-brand-primary/10 hover:border-brand-primary dark:bg-zinc-800 dark:hover:bg-brand-primary/20 text-gray-700 dark:text-zinc-300 font-bold text-xs cursor-pointer text-left transition-all hover:scale-102"
                                            >
                                                <div className="text-brand-primary dark:text-brand-sage shrink-0">
                                                    {opt.icon}
                                                </div>
                                                <span>{opt.name}</span>
                                            </button>
                                        ));
                                    })()}
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-200 dark:border-zinc-800 pt-4">
                                    <button
                                        onClick={() => setCheckoutStep("action")}
                                        className="btn btn-sm btn-ghost text-xs cursor-pointer font-bold uppercase tracking-wider"
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Print Render Containers (Invisible to user) */}
            <div className="hidden">
                {printData && (
                    <ReceiptTemplate
                        ref={receiptRef}
                        profileData={companyInfo}
                        invoiceData={printData}
                        onPrintComplete={() => {
                            setPrintData(null);
                            // After customer receipt is done, flush any pending KOTs
                            if (pendingKotQueueRef.current.length > 0) {
                                setKotQueue(prev => [...prev, ...pendingKotQueueRef.current]);
                                pendingKotQueueRef.current = [];
                            }
                        }}
                    />
                )}
                {/* KOT per-kitchen sequential printer */}
                {currentKot && currentKot.invoiceData && (
                    <KitchenReceiptTemplate
                        ref={kitchenReceiptRef}
                        profileData={companyInfo}
                        invoiceData={currentKot.invoiceData}
                        kitchenName={currentKot.kitchenName}
                        onPrintComplete={() => setCurrentKot(null)}
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
