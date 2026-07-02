"use client";

import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaMoneyBillWave, FaCreditCard, FaUniversity, FaSearch } from "react-icons/fa";
import { FaCcVisa, FaCcAmex } from "react-icons/fa6";
import { RiMastercardFill } from "react-icons/ri";
import { MdOutlineSendToMobile } from "react-icons/md";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";

const ProductSelection = ({
    products, 
    categories, 
    selectedCategory, 
    setSelectedCategory, 
    addProduct, 
    loading,
    isProcessing,
    selectedPaymentMethod,
    selectedSubMethod,
    selectedCardIcon,
    handleMainPaymentButtonClick,
    handleSubPaymentButtonClick
}) => {
    const { user } = useContext(AuthContext);
    const axiosSecure = useAxiosSecure();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Debounced search logic for foods
    useEffect(() => {
        const fetchSearchResults = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                // Query Chayatol resort foods
                const res = await axiosSecure.get(`/food/get?page=1&limit=100&search=${encodeURIComponent(searchQuery)}`);
                if (res.data && res.data.success) {
                    setSearchResults(res.data.data);
                }
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            fetchSearchResults();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, axiosSecure]);

    const rowVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
        exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
    };

    const clearSearch = () => {
        setSearchQuery("");
        setSearchResults([]);
    };

    // Determine product list source: search results or filtered products by category
    const displayProducts = searchQuery.trim().length > 0 
        ? searchResults 
        : (products || []).filter(p => p.category === selectedCategory);

    const cardOptions = [
        { name: "Visa Card", icon: <FaCcVisa /> },
        { name: "Master Card", icon: <RiMastercardFill /> },
        { name: "Amex Card", icon: <FaCcAmex /> },
    ];
    
    const mobileOptions = [
        { name: "Bkash", icon: "BkashLogo" },
        { name: "Nagad", icon: "NagadLogo" },
        { name: "Rocket", icon: "RocketLogo" },
    ];

    return (
        <div className="w-full lg:w-4/6 p-1 sm:p-1 font-inter text-gray-800 dark:text-zinc-100">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="card bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl"
            >
                <div className="card-body p-3 sm:p-6">
                    
                    {/* --- SEARCH BAR UI --- */}
                    <div className="mb-2 px-2">
                        <div className="relative w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaSearch className="text-gray-400 dark:text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search active products..."
                                className="input input-bordered w-full pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button 
                                    onClick={clearSearch}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-zinc-400 dark:hover:text-zinc-200"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* --- Categories --- */}
                    <div className="mb-4">
                        <div className="flex flex-wrap p-2 gap-1 sm:gap-1">
                            <motion.button
                                onClick={() => {
                                    setSelectedCategory("All");
                                    clearSearch();
                                }}
                                className={`btn btn-sm rounded-full shadow-sm transition-colors duration-300 ${
                                    selectedCategory === "All" && searchQuery === ""
                                    ? "bg-brand-primary hover:bg-brand-secondary text-white border-none" 
                                    : "btn-ghost dark:text-zinc-300 dark:hover:bg-zinc-800"
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                All
                            </motion.button>
                            {categories.map((category) => {
                                const catName = typeof category === 'object' ? category.categoryName : category;
                                return (
                                    <motion.button
                                        key={catName}
                                        onClick={() => {
                                            setSelectedCategory(catName);
                                            clearSearch();
                                        }}
                                        className={`btn btn-sm rounded-full shadow-sm transition-colors duration-300 ${
                                            selectedCategory === catName && searchQuery === ""
                                            ? "bg-brand-primary hover:bg-brand-secondary text-white border-none" 
                                            : "btn-ghost dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        }`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {catName}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- Products Table --- */}
                    <div className="h-[55vh] overflow-y-auto custom-scrollbar">
                        {loading && !searchQuery ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-primary"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table table-pin-rows table-zebra min-w-full">
                                    <thead>
                                        <tr>
                                            <th className="bg-slate-50 dark:bg-zinc-800 dark:text-zinc-200 p-2 sm:p-4 rounded-tl-lg">Picture</th>
                                            <th className="bg-slate-50 dark:bg-zinc-800 dark:text-zinc-200 p-2 sm:p-4">Product</th>
                                            <th className="bg-slate-50 dark:bg-zinc-800 dark:text-zinc-200 p-2 sm:p-4">Rate</th>
                                            <th className="bg-slate-50 dark:bg-zinc-800 dark:text-zinc-200 p-2 sm:p-4 text-center rounded-tr-lg">Action</th>
                                        </tr>
                                    </thead>
                                    
                                    <tbody>
                                        <AnimatePresence mode="popLayout">
                                            {displayProducts.length > 0 ? (
                                                displayProducts.map((product) => (
                                                    <motion.tr
                                                        key={product._id}
                                                        layout
                                                        variants={rowVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        exit="exit"
                                                        className="hover dark:hover:bg-zinc-800/40 border-b dark:border-zinc-800"
                                                    >
                                                        <td className="p-2 sm:px-4">
                                                            <div className="avatar">
                                                                <div className="mask mask-squircle w-12 h-12">
                                                                    <img
                                                                        src={product.image || "https://placehold.co/64x64/E0E0E0/666666?text=Food"}
                                                                        alt={product.foodName || product.productName}
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.src = "https://placehold.co/64x64/E0E0E0/666666?text=No+Img";
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="font-bold text-sm sm:text-base text-gray-800 dark:text-zinc-200">
                                                            {product.foodName || product.productName}
                                                            {searchQuery && (
                                                                <span className="badge badge-ghost dark:bg-zinc-850 dark:text-zinc-400 badge-xs ml-2 font-normal border dark:border-zinc-700">
                                                                    {product.category}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="font-semibold text-sm sm:text-base dark:text-zinc-300">{product.price} TK</td>
                                                        <td className="text-center p-2 sm:px-4">
                                                            <motion.button
                                                                onClick={() => addProduct(product)}
                                                                className="btn btn-sm rounded-full flex items-center gap-2 bg-brand-primary hover:bg-brand-secondary text-white border-none cursor-pointer"
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                            >
                                                                <FaPlus />
                                                                <span className="hidden sm:inline">Add</span>
                                                            </motion.button>
                                                        </td>
                                                    </motion.tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-8 text-gray-500 dark:text-zinc-400">
                                                        {isSearching 
                                                            ? "Searching..." 
                                                            : `No products found matching "${searchQuery}"`
                                                        }
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* --- PAYMENT METHOD SECTION --- */}
                    <div className="divider mt-2 mb-2 dark:text-zinc-400">Payment Options</div>
                    <div className="p-2 rounded-xl">
                        <div className="flex justify-center flex-wrap gap-3">
                            {["Cash", "Card", "Mobile", "Bank"].map((method) => (
                                <button key={method} onClick={() => handleMainPaymentButtonClick(method)} className={`btn btn-md min-w-[110px] cursor-pointer ${selectedPaymentMethod === method || (selectedSubMethod && cardOptions.some(o => o.name === selectedSubMethod) && method === 'Card') || (selectedSubMethod && mobileOptions.some(o => o.name === selectedSubMethod) && method === 'Mobile') || (selectedPaymentMethod === 'Bank' && method === 'Bank') ? "bg-brand-primary hover:bg-brand-secondary text-white border-brand-secondary" : "btn-ghost dark:text-zinc-350 dark:hover:bg-zinc-800 border dark:border-zinc-800/60"}`} disabled={isProcessing}>
                                    {method === "Cash" && <FaMoneyBillWave />}
                                    {method === "Card" && (selectedCardIcon || <FaCreditCard />)}
                                    {method === "Mobile" && <MdOutlineSendToMobile />}
                                    {method === "Bank" && <FaUniversity />}
                                    {method}
                                </button>
                            ))}
                        </div>
                        {selectedPaymentMethod === 'Card' && (<div className="mt-4 flex flex-wrap justify-center gap-3">{cardOptions.map((card) => (<button key={card.name} onClick={() => handleSubPaymentButtonClick(card.name, card.icon)} className={`btn btn-sm cursor-pointer ${selectedSubMethod === card.name ? "bg-brand-primary hover:bg-brand-secondary text-white" : "btn-ghost dark:text-zinc-350 dark:hover:bg-zinc-800 border dark:border-zinc-800/60"}`} disabled={isProcessing}>{card.icon}<span>{card.name}</span></button>))}</div>)}
                        {selectedPaymentMethod === 'Mobile' && (<div className="mt-4 flex flex-wrap justify-center gap-3">{mobileOptions.map((mobile) => (<button key={mobile.name} onClick={() => handleSubPaymentButtonClick(mobile.name)} className={`btn btn-sm cursor-pointer ${selectedSubMethod === mobile.name ? "bg-brand-primary hover:bg-brand-secondary text-white" : "btn-ghost dark:text-zinc-350 dark:hover:bg-zinc-800 border dark:border-zinc-800/60"}`} disabled={isProcessing}><span>{mobile.name}</span></button>))}</div>)}
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default ProductSelection;
