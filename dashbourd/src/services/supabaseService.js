
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase/client';

const DEFAULT_TIMEOUT = 10000;

/**
 * دالة موحدة لجلب البيانات مع مهلة زمنية (Timeout) وخيار التبديل للـ REST API المباشر
 * @param {Object} query - استعلام supabase
 * @param {String} tableName - اسم الجدول (للفلبات)
 * @param {Number} timeoutMs - مهلة الوقت بالملي ثانية
 */
export const fetchWithTimeout = async (query, tableName, timeoutMs = DEFAULT_TIMEOUT) => {
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SUPABASE_CLIENT_HANG')), timeoutMs)
        );
        
        // Ensure we are racing with a real promise (supabase builders are thenables)
        const { data, error, count } = await Promise.race([
            Promise.resolve(query), 
            timeoutPromise
        ]);

        if (error) throw error;
        return { data, count, error: null };
    } catch (error) {
        console.error(`[supabaseService] Error fetching from ${tableName}:`, error.message);

        // إذا علق العميل أو كان هناك خطأ في الاتصال، نحاول الجلب المباشر
        if (error.message === 'SUPABASE_CLIENT_HANG' || error.message.includes('fetch')) {
            console.warn(`[supabaseService] Falling back to direct REST fetch for ${tableName}...`);
            try {
                // محاولة الاتصال بـ REST API الخاص بـ Supabase مباشرة
                const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*`, {
                    headers: {
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${supabaseAnonKey}`
                    }
                });
                if (!response.ok) throw new Error('REST_API_FAILED');
                const data = await response.json();
                return { data, count: data.length, error: null };
            } catch (fallbackErr) {
                console.error(`[supabaseService] Fallback also failed:`, fallbackErr.message);
            }
        }

        return { data: [], count: 0, error: error.message };
    }
};

/**
 * جلب المستخدمين مع دعم البحث والصفحات
 */
export const fetchUsersPaging = async (page = 0, pageSize = 12, searchQuery = '') => {
    let query = supabase.from('profiles').select('*', { count: 'exact' });

    if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,whatsapp.ilike.%${searchQuery}%`);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    let result = await fetchWithTimeout(query.range(from, to), 'profiles');

    // إذا فشل بسبب فقدان ميزة التتبع (العمود غير موجود)، نحاول بدون الترتيب
    if (result.error && (result.error.includes('last_seen') || result.error.includes('column'))) {
        console.warn("[supabaseService] Retrying without last_seen ordering...");
        let fallbackQuery = supabase.from('profiles').select('*', { count: 'exact' });
        if (searchQuery) fallbackQuery = fallbackQuery.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,whatsapp.ilike.%${searchQuery}%`);
        fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
        result = await fetchWithTimeout(fallbackQuery.range(from, to), 'profiles');
    }

    return result;
};

/**
 * جلب الطلبات مع دعم البحث والصفحات
 */
export const fetchOrdersPaging = async (page = 0, pageSize = 6, filters = {}) => {
    let query = supabase.from('orders').select('*, profiles(full_name, email, whatsapp, governorate, district, neighborhood)', { count: 'exact' });

    if (filters.searchQuery) {
        const isUUID = filters.searchQuery.length === 36 && /^[0-9a-f-]+$/i.test(filters.searchQuery);
        if (isUUID) {
            query = query.eq('id', filters.searchQuery);
        } else {
            query = query.or(`customer_name.ilike.%${filters.searchQuery}%,customer_phone.ilike.%${filters.searchQuery}%,profiles.full_name.ilike.%${filters.searchQuery}%,profiles.whatsapp.ilike.%${filters.searchQuery}%`);
        }
    }

    const status = filters.statusFilter || filters.status;
    if (status && status !== 'all') {
        query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const from = page * pageSize;
    const to = from + pageSize - 1;

    let result = await fetchWithTimeout(query.range(from, to), 'orders');

    // إذا فشل بسبب علاقة الجداول (Profiles Relationship Error)
    if (result.error && (result.error.includes('relationship') || result.error.includes('profiles'))) {
        console.warn("[supabaseService] Retrying orders fetch without profiles join...");
        let fallbackQuery = supabase.from('orders').select('*', { count: 'exact' });
        
        if (filters.searchQuery) {
            const isUUID = filters.searchQuery.length === 36 && /^[0-9a-f-]+$/i.test(filters.searchQuery);
            if (isUUID) {
                fallbackQuery = fallbackQuery.eq('id', filters.searchQuery);
            } else {
                fallbackQuery = fallbackQuery.or(`customer_name.ilike.%${filters.searchQuery}%,customer_phone.ilike.%${filters.searchQuery}%`);
            }
        }

        const statusFallback = filters.statusFilter || filters.status;
        if (statusFallback && statusFallback !== 'all') {
            fallbackQuery = fallbackQuery.eq('status', statusFallback);
        }
        
        fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
        result = await fetchWithTimeout(fallbackQuery.range(from, to), 'orders');
    }

    return result;
};
