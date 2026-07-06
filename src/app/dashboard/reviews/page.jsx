"use client";

import React, { useState, useEffect, useContext, useCallback, Suspense } from 'react';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiSearch, FiEye, FiTrash2, FiX, FiRefreshCw } from 'react-icons/fi';
import { FaStar, FaRegStar } from 'react-icons/fa';
import useAxiosSecure from '@/hooks/useAxiosSecure';
import usePagePermission from "@/hooks/usePagePermission";
import { AuthContext } from '@/providers/AuthProvider';
import MtableLoading from '@/components/Comon/MtableLoading';

// Helper component to display star ratings
const StarRating = ({ rating }) => {
    const totalStars = 5;
    const fullStars = Math.floor(rating);
    return (
        <div className="flex items-center text-amber-500 gap-0.5">
            {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className="w-4.5 h-4.5" />)}
            {[...Array(totalStars - fullStars)].map((_, i) => <FaRegStar key={`empty-${i}`} className="w-4.5 h-4.5" />)}
        </div>
    );
};

function ViewReviewContent() {
    const axiosSecure = useAxiosSecure();
    const { user } = useContext(AuthContext);
    const { canDelete } = usePagePermission();

    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ totalPages: 1, totalDocs: 0 });

    // Modals
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);

    // Filters
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [ratingFilter, setRatingFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchReviews = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: 10,
                search: searchTerm,
                rating: ratingFilter,
                startDate,
                endDate
            };

            // Remove empty keys
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const response = await axiosSecure.get("/review", { params });
            if (response.data?.success) {
                setReviews(response.data.data || []);
                setPagination({
                    totalPages: response.data.pagination?.totalPages || 1,
                    totalDocs: response.data.pagination?.totalDocs || 0
                });
            }
        } catch (error) {
            console.error("Error fetching reviews:", error);
            Swal.fire("Error!", "Failed to fetch reviews.", "error");
            setReviews([]);
        } finally {
            setIsLoading(false);
        }
    }, [axiosSecure, currentPage, searchTerm, ratingFilter, startDate, endDate]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, ratingFilter, startDate, endDate]);

    const clearFilters = () => {
        setRatingFilter('');
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setIsFilterOpen(false);
    };

    const handleViewReview = (review) => {
        setSelectedReview(review);
        setIsViewModalOpen(true);
    };

    const handleDeleteReview = (reviewId) => {
        if (!canDelete) {
            Swal.fire("Restricted", "You do not have permission to delete reviews.", "warning");
            return;
        }
        if (isDeleting) return;
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    setIsDeleting(true);
                    const response = await axiosSecure.delete(`/review/${reviewId}`);
                    if (response.data?.success || response.status === 200) {
                        Swal.fire('Deleted!', 'The review has been deleted.', 'success');
                        fetchReviews();
                    }
                } catch (error) {
                    console.error("Error deleting review:", error);
                    Swal.fire('Error!', 'Failed to delete the review.', 'error');
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-150 min-h-screen font-sans transition-colors duration-200">
            <div className="max-w-6xl mx-auto">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 dark:text-zinc-100 tracking-tight">Customer Reviews</h1>
                        <p className="text-sm text-gray-500 mt-1">Guest ratings, comments, and transaction feedbacks</p>
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`mt-3 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 border rounded-lg shadow-sm text-sm font-semibold cursor-pointer transition-colors duration-200
                            ${isFilterOpen ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 hover:bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250 dark:hover:bg-zinc-800"}`}
                    >
                        <FiFilter /> Filters {isFilterOpen ? "Open" : ""}
                    </button>
                </div>

                {/* Filters Board */}
                {isFilterOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 shadow-md rounded-xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Search Guest/Feedback</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Name, phone, or comment..."
                                    className="input input-bordered input-sm w-full pl-9 dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Star Rating</label>
                            <select
                                value={ratingFilter}
                                onChange={(e) => setRatingFilter(e.target.value)}
                                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                            >
                                <option value="">All Ratings</option>
                                <option value="5">5 Stars</option>
                                <option value="4">4 Stars</option>
                                <option value="3">3 Stars</option>
                                <option value="2">2 Stars</option>
                                <option value="1">1 Star</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">End Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 mt-2">
                            <button
                                onClick={clearFilters}
                                className="btn btn-sm btn-ghost text-xs cursor-pointer"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Table list */}
                {isLoading ? <MtableLoading /> : (
                    <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-slate-50 dark:bg-zinc-800 text-xs text-gray-500 dark:text-zinc-200 font-bold uppercase">
                                    <tr>
                                        <th className="px-6 py-4 text-left rounded-tl-lg">Guest</th>
                                        <th className="px-6 py-4 text-left">Phone</th>
                                        <th className="px-6 py-4 text-left">Rating</th>
                                        <th className="px-6 py-4 text-left">Comment</th>
                                        <th className="px-6 py-4 text-left">Date</th>
                                        <th className="px-6 py-4 text-right rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-255 dark:divide-zinc-850 text-sm font-semibold text-gray-700 dark:text-zinc-350">
                                    {reviews.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-bold">
                                                No guest reviews found matching current filter query.
                                            </td>
                                        </tr>
                                    ) : (
                                        reviews.map((review) => (
                                            <tr key={review._id} className="hover:bg-slate-50 dark:hover:bg-zinc-850/50 transition border-b border-gray-200 dark:border-zinc-800">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-zinc-150 font-bold">
                                                    {review.customerName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-zinc-400">
                                                    {review.customerPhone}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <StarRating rating={review.rating} />
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate text-gray-650 dark:text-zinc-300">
                                                    {review.comment}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-505 dark:text-zinc-400">
                                                    {new Date(review.createdAt).toLocaleDateString("en-GB")}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleViewReview(review)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-150 hover:bg-blue-200 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-md font-bold cursor-pointer"
                                                        >
                                                            <FiEye /> View
                                                        </button>
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDeleteReview(review._id)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-150 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-md font-bold cursor-pointer"
                                                            >
                                                                <FiTrash2 /> Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* View Modal */}
            {isViewModalOpen && selectedReview && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-md w-full relative">
                        <button
                            onClick={() => setIsViewModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        >
                            <FiX size={20} />
                        </button>
                        
                        <h2 className="text-xl font-bold mb-4">Guest Feedback Details</h2>
                        
                        <div className="space-y-4 text-sm font-semibold">
                            <div>
                                <label className="block text-xs text-gray-400 mb-0.5">Guest Name</label>
                                <p className="text-gray-900 dark:text-zinc-150">{selectedReview.customerName}</p>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-0.5">Guest Contact</label>
                                <p className="text-gray-900 dark:text-zinc-150">{selectedReview.customerPhone}</p>
                            </div>
                            {selectedReview.invoiceNo && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-0.5">Invoice Serial</label>
                                    <p className="text-blue-600 dark:text-blue-400">{selectedReview.invoiceNo}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs text-gray-400 mb-0.5">Rating Score</label>
                                <div className="mt-1">
                                    <StarRating rating={selectedReview.rating} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-0.5">Review Comment</label>
                                <p className="text-gray-700 dark:text-zinc-300 font-medium bg-gray-50 dark:bg-zinc-850 p-3 rounded-lg border dark:border-zinc-800 leading-relaxed mt-1">
                                    {selectedReview.comment}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ViewReviewPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <ViewReviewContent />
        </Suspense>
    );
}
