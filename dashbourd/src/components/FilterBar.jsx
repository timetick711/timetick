import React from 'react';
import { Search, ArrowUpDown, DollarSign, RotateCcw } from 'lucide-react';

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
                padding: '20px',
                marginBottom: '30px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-md)'
            }}
        >
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '200px', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="بحث باسم المنتج أو الرقم..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 40px 10px 10px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontFamily: 'var(--font-main)'
                    }}
                />
            </div>

            {/* Type Filter */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: filterType === type.value ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                            background: filterType === type.value ? 'var(--primary)' : 'transparent',
                            color: filterType === type.value ? '#000' : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            fontSize: '0.9rem'
                        }}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            {/* Style and Price */}
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                    value={filterStyle}
                    onChange={(e) => setFilterStyle(e.target.value)}
                    style={{
                        padding: '8px 15px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-main)',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">جميع الأنماط</option>
                    <option value="classic">كلاسيكي</option>
                    <option value="formal">رسمي</option>
                    <option value="wedding">عرائسي</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <DollarSign size={16} color="var(--primary)" />
                    <input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        style={{ width: '70px', padding: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', textAlign: 'center' }}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                    <input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        style={{ width: '70px', padding: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', textAlign: 'center' }}
                    />
                </div>

                <button
                    onClick={() => setSortPrice(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? 'none' : 'asc')}
                    style={{ padding: '8px', background: 'transparent', border: 'none', color: sortPrice !== 'none' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    title="ترتيب حسب السعر"
                >
                    <ArrowUpDown size={20} />
                </button>

                {/* Reset Button */}
                {(searchQuery || filterType !== 'all' || filterStyle !== 'all' || minPrice || maxPrice || sortPrice !== 'none') && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setFilterType('all');
                            setFilterStyle('all');
                            setMinPrice('');
                            setMaxPrice('');
                            setSortPrice('none');
                        }}
                        style={{
                            padding: '8px 15px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            transition: '0.3s'
                        }}
                    >
                        <RotateCcw size={16} /> إعادة تعيين
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilterBar;
