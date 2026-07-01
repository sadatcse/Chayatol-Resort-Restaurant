"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiCalendar } from "react-icons/fi";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";

function ProductSalesContent() {
    const axiosSecure = useAxiosSecure();

    const getFormattedDate = (date) => {
        return date.toISOString().slice(0, 10);
    };

    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("All");
    const [startDate, setStartDate] = useState(getFormattedDate(new Date()));
    const [endDate, setEndDate] = useState(getFormattedDate(new Date()));
    const [displays, setDisplays] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axiosSecure.get("/category");
                if (response.data) {
                    setCategories(response.data);
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchCategories();
    }, [axiosSecure]);

    // Fetch products based on category
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Fetch restaurant food items
                const response = await axiosSecure.get("/food/get?page=1&limit=1000");
                if (response.data?.data) {
                    let items = response.data.data;
                    if (selectedCategory !== "All") {
                        items = items.filter(f => f.category === selectedCategory);
                    }
                    setProducts(items);
                    setSelectedProduct("All");
                }
            } catch (error) {
                console.error("Error fetching products:", error);
            }
        };
        fetchProducts();
    }, [axiosSecure, selectedCategory]);

    const handleSearch = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosSecure.get(
                `/pos/invoice/sales?category=${selectedCategory}&product=${selectedProduct}&startDate=${startDate}&endDate=${endDate}`
            );
            if (response.data) {
                setDisplays(response.data);
            }
        } catch (error) {
            console.error("Error fetching product sales data:", error);
            setDisplays([]);
        } finally {
            setIsLoading(false);
        }
    }, [axiosSecure, selectedCategory, selectedProduct, startDate, endDate]);

    useEffect(() => {
        handleSearch();
    }, [handleSearch]);

    const sortedDisplays = useMemo(() => {
        let sortableItems = [...displays];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [displays, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name) => {
        if (sortConfig.key !== name) {
            return <FaSort className="inline-block ml-1 text-slate-400" />;
        }
        return sortConfig.direction === 'ascending' ? (
            <FaSortUp className="inline-block ml-1 text-blue-500" />
        ) : (
            <FaSortDown className="inline-block ml-1 text-blue-500" />
        );
    };

    const totalQuantity = displays.reduce((sum, item) => sum + item.qty, 0);
    const totalRevenue = displays.reduce((sum, item) => sum + (item.qty * item.rate), 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen font-sans transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                
                <header className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 dark:text-zinc-100 tracking-tight">Product Sales Report</h1>
                        <p className="text-sm text-gray-500 mt-1">Item-wise details of items sold</p>
                    </div>
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 shadow-xl mb-6"
                >
                    <div className="card-body p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                            <div className="form-control">
                                <label className="label"><span className="label-text text-xs font-bold text-gray-500">Category</span></label>
                                <select 
                                    value={selectedCategory} 
                                    onChange={(e) => setSelectedCategory(e.target.value)} 
                                    className="select select-bordered select-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-150 w-full text-xs"
                                >
                                    <option value="All">All Categories</option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat.categoryName}>{cat.categoryName}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="form-control">
                                <label className="label"><span className="label-text text-xs font-bold text-gray-500">Product</span></label>
                                <select 
                                    value={selectedProduct} 
                                    onChange={(e) => setSelectedProduct(e.target.value)} 
                                    className="select select-bordered select-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-150 w-full text-xs"
                                >
                                    <option value="All">All Products</option>
                                    {products.map((prod) => (
                                        <option key={prod._id} value={prod.foodName}>{prod.foodName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-control flex flex-col">
                                <label className="label"><span className="label-text text-xs font-bold text-gray-500">From Date</span></label>
                                <input
                                    type="date"
                                    className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div className="form-control flex flex-col">
                                <label className="label"><span className="label-text text-xs font-bold text-gray-500">To Date</span></label>
                                <input
                                    type="date"
                                    className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            <button 
                                onClick={handleSearch} 
                                className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow w-full" 
                                disabled={isLoading}
                            >
                                <FiSearch /> Search
                            </button>
                        </div>
                    </div>
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 shadow-xl"
                >
                    <div className="card-body p-6">
                        {isLoading ? (
                            <MtableLoading />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                    <thead className="bg-slate-50 dark:bg-zinc-800 text-xs text-gray-500 dark:text-zinc-200 font-bold uppercase border-b border-gray-200 dark:border-zinc-700">
                                        <tr>
                                            <th className="p-3 text-left rounded-tl-lg">SL.No</th>
                                            <th className="p-3">
                                                <button onClick={() => requestSort('productName')} className="flex items-center gap-1 font-bold">
                                                    Product Name {getSortIcon('productName')}
                                                </button>
                                            </th>
                                            <th className="p-3 text-right">
                                                <button onClick={() => requestSort('rate')} className="flex items-center gap-1 ml-auto font-bold">
                                                    Unit Price {getSortIcon('rate')}
                                                </button>
                                            </th>
                                            <th className="p-3 text-center">
                                                <button onClick={() => requestSort('qty')} className="flex items-center gap-1 mx-auto font-bold">
                                                    Total Sold {getSortIcon('qty')}
                                                </button>
                                            </th>
                                            <th className="p-3 text-right rounded-tr-lg font-bold">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800 text-sm font-semibold text-gray-700 dark:text-zinc-350">
                                        <AnimatePresence>
                                            {sortedDisplays.length > 0 ? (
                                                sortedDisplays.map((prod, index) => (
                                                    <tr key={prod.productName + index} className="hover:bg-slate-50 dark:hover:bg-zinc-850/50 border-b border-gray-200 dark:border-zinc-800 transition">
                                                        <td className="p-3 text-left">{index + 1}</td>
                                                        <td className="p-3 text-left font-bold text-gray-800 dark:text-zinc-150">{prod.productName}</td>
                                                        <td className="p-3 text-right">৳ {prod.rate.toFixed(0)}</td>
                                                        <td className="p-3 text-center text-blue-600 dark:text-blue-400 font-extrabold">{prod.qty}</td>
                                                        <td className="p-3 text-right font-extrabold text-gray-900 dark:text-zinc-200">৳ {(prod.qty * prod.rate).toFixed(0)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td className="p-3 text-center text-gray-400" colSpan="5">
                                                        No product sales records matched the filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </tbody>
                                    {sortedDisplays.length > 0 && (
                                        <tfoot className="font-extrabold bg-slate-100 dark:bg-zinc-850 text-slate-800 dark:text-zinc-200">
                                            <tr>
                                                <td className="p-3 rounded-bl-lg" colSpan={3}>Summary Totals</td>
                                                <td className="p-3 text-center text-blue-650 dark:text-blue-400">{totalQuantity}</td>
                                                <td className="p-3 text-right text-gray-900 dark:text-zinc-200 rounded-br-lg">৳ {totalRevenue.toFixed(0)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default function ProductSalesPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <ProductSalesContent />
        </Suspense>
    );
}
