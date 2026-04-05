import React from 'react';
import { Search, ArrowUpDown, DollarSign, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const FilterBar = ({
    searchQuery, setSearchQuery,
    filterType, setFilterType,
    filterStyle, setFilterStyle,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    sortPrice, setSortPrice
}) => {
    return (
        <div
            className="glass-card"
            style={{
                padding: '24px',
                marginBottom: '40px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: '24px',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '24px',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--border-color)'
            }}
        >
            {/* Search Section */}
            <div style={{ position: 'relative', minWidth: '320px', flex: 1.5 }}>
                <Search size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', opacity: 0.7 }} />
                <input
                    type="text"
                    placeholder="بحث في المخزون: اسم المنتج، الرقم، أو التوصيف..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '14px 48px 14px 16px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '14px',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: '0.3s',
                        fontFamily: 'inherit'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
            </div>

            {/* Filters Section */}
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    {[
                        { label: 'الكل', value: 'all' },
                        { label: 'رجالي', value: 'men' },
                        { label: 'نسائي', value: 'women' },
                        { label: 'أطفال', value: 'kids' }
                    ].map(type => (
                        <button
                            key={type.value}
                            onClick={() => setFilterType(type.value)}
                            style={{
                                padding: '10px 22px',
                                borderRadius: '12px',
                                border: 'none',
                                background: filterType === type.value ? 'var(--primary)' : 'transparent',
                                color: filterType === type.value ? '#000' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                fontSize: '0.9rem',
                                fontWeight: '700'
                            }}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                <select
                    value={filterStyle}
                    onChange={(e) => setFilterStyle(e.target.value)}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-color)',
                        color: '#fff',
                        cursor: 'pointer',
                        outline: 'none',
                        fontSize: '0.95rem',
                        fontWeight: '600'
                    }}
                >
                    <option value="all" style={{ background: '#141414' }}>جميع الأنماط</option>
                    <option value="classic" style={{ background: '#141414' }}>كلاسيكي</option>
                    <option value="formal" style={{ background: '#141414' }}>رسمي</option>
                    <option value="wedding" style={{ background: '#141414' }}>عرائسي</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    <DollarSign size={18} color="var(--primary)" />
                    <input
                        type="number"
                        placeholder="الأدنى"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        style={{ width: '80px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'center', outline: 'none' }}
                    />
                    <span style={{ color: 'var(--border-color)' }}>|</span>
                    <input
                        type="number"
                        placeholder="الأقصى"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        style={{ width: '80px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'center', outline: 'none' }}
                    />
                </div>

                <button
                    onClick={() => setSortPrice(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? 'none' : 'asc')}
                    style={{ 
                        width: '48px', height: '48px', borderRadius: '14px', 
                        background: sortPrice !== 'none' ? 'var(--primary)' : 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--border-color)', 
                        color: sortPrice !== 'none' ? '#000' : 'var(--text-muted)', 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: '0.3s'
                    }}
                    title="ترتيب الأسعار"
                >
                    <ArrowUpDown size={20} />
                </button>

                {/* Reset Action */}
                {(searchQuery || filterType !== 'all' || filterStyle !== 'all' || minPrice || maxPrice || sortPrice !== 'none') && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => {
                            setSearchQuery('');
                            setFilterType('all');
                            setFilterStyle('all');
                            setMinPrice('');
                            setMaxPrice('');
                            setSortPrice('none');
                        }}
                        style={{
                            padding: '12px 20px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '14px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '700'
                        }}
                    >
                        <RotateCcw size={16} /> تهيئة
                    </motion.button>
                )}
            </div>
        </div>
    );
};

export default FilterBar;
