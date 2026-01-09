import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

/**
 * ScrollableList - Unified component for lists with scroll/pagination
 * 
 * @param {Array} items - Array of items to display
 * @param {Function} renderItem - Render function for each item (item, index) => JSX
 * @param {number} maxHeight - Max height in pixels before scroll (default: 400)
 * @param {number} pageSize - Items per page for pagination mode (default: 10)
 * @param {'scroll' | 'paginate'} mode - Display mode (default: 'scroll')
 * @param {boolean} searchable - Enable search filter
 * @param {Function} searchFilter - Custom search filter function (item, query) => boolean
 * @param {string} searchPlaceholder - Placeholder text for search
 * @param {string} emptyMessage - Message when no items
 * @param {string} emptyIcon - Lucide icon component for empty state
 * @param {string} className - Additional classes for container
 */
export default function ScrollableList({
    items = [],
    renderItem,
    maxHeight = 400,
    pageSize = 10,
    mode = 'scroll',
    searchable = false,
    searchFilter,
    searchPlaceholder = 'Search...',
    emptyMessage = 'No items found',
    emptyIcon: EmptyIcon,
    className = '',
    headerContent,
    footerContent,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    // Filter items by search
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        if (searchFilter) {
            return items.filter(item => searchFilter(item, searchQuery.toLowerCase()));
        }
        return items;
    }, [items, searchQuery, searchFilter]);
    
    // Paginate if needed
    const displayItems = useMemo(() => {
        if (mode === 'paginate') {
            const start = (currentPage - 1) * pageSize;
            return filteredItems.slice(start, start + pageSize);
        }
        return filteredItems;
    }, [filteredItems, currentPage, pageSize, mode]);
    
    const totalPages = Math.ceil(filteredItems.length / pageSize);
    
    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);
    
    return (
        <div className={`flex flex-col ${className}`}>
            {/* Search Bar */}
            {searchable && (
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-200 rounded-full transition-colors"
                        >
                            <X className="w-3 h-3 text-neutral-500" />
                        </button>
                    )}
                </div>
            )}
            
            {/* Header Content */}
            {headerContent && (
                <div className="mb-3">
                    {headerContent}
                </div>
            )}
            
            {/* Empty State */}
            {displayItems.length === 0 ? (
                <div className="py-12 text-center">
                    {EmptyIcon && (
                        <div className="w-12 h-12 mx-auto mb-3 bg-neutral-100 rounded-full flex items-center justify-center">
                            <EmptyIcon className="w-6 h-6 text-neutral-400" />
                        </div>
                    )}
                    <p className="text-neutral-500 text-sm">{emptyMessage}</p>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mt-2 text-indigo-600 text-sm hover:underline"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Scrollable List */}
                    <div 
                        className={`${mode === 'scroll' ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent' : ''}`}
                        style={mode === 'scroll' ? { maxHeight: `${maxHeight}px` } : undefined}
                    >
                        <AnimatePresence mode="popLayout">
                            {displayItems.map((item, index) => (
                                <motion.div
                                    key={item.id || index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.02 }}
                                >
                                    {renderItem(item, index)}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                    
                    {/* Pagination Controls */}
                    {mode === 'paginate' && totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-200">
                            <p className="text-sm text-neutral-500">
                                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                                    currentPage === pageNum
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'hover:bg-neutral-100 text-neutral-600'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Scroll indicator for scroll mode */}
                    {mode === 'scroll' && filteredItems.length > 5 && (
                        <div className="text-center pt-2 text-xs text-neutral-400">
                            {filteredItems.length} items – Scroll for more
                        </div>
                    )}
                </>
            )}
            
            {/* Footer Content */}
            {footerContent && (
                <div className="mt-3">
                    {footerContent}
                </div>
            )}
        </div>
    );
}

/**
 * Simple scrollable container for custom layouts
 */
export function ScrollContainer({ 
    maxHeight = 400, 
    children, 
    className = '',
    showScrollHint = true,
    itemCount = 0
}) {
    return (
        <div className={`flex flex-col ${className}`}>
            <div 
                className="overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent"
                style={{ maxHeight: `${maxHeight}px` }}
            >
                {children}
            </div>
            {showScrollHint && itemCount > 5 && (
                <div className="text-center pt-2 text-xs text-neutral-400">
                    {itemCount} items – Scroll for more
                </div>
            )}
        </div>
    );
}
