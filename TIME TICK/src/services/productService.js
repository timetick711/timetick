
import { supabase } from '../supabase/client';

export const fetchProductsFromFirestore = async () => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
            throw error;
        }

        return data || [];
    } catch (error) {
        console.error('Unexpected error fetching products:', error);
        return [];
    }
};

export const fetchProductsPaginated = async (page = 0, pageSize = 6, filters = {}) => {
    try {
        let query = supabase
            .from('products')
            .select('*', { count: 'exact' });

        // Apply filters if provided
        if (filters.category && filters.category !== 'all') {
            query = query.eq('category', filters.category);
        }
        if (filters.style && filters.style !== 'all') {
            query = query.eq('style', filters.style);
        }
        if (filters.minPrice) {
            query = query.gte('price', filters.minPrice);
        }
        if (filters.maxPrice) {
            query = query.lte('price', filters.maxPrice);
        }

        // Apply sorting
        if (filters.sortPrice === 'asc') {
            query = query.order('price', { ascending: true });
        } else if (filters.sortPrice === 'desc') {
            query = query.order('price', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await query.range(from, to);

        if (error) throw error;

        return {
            products: data || [],
            hasMore: count > to,
            total: count
        };
    } catch (error) {
        console.error('Error in fetchProductsPaginated:', error);
        return { products: [], hasMore: false, total: 0 };
    }
};

export const subscribeToProducts = (callback) => {
    // Realtime subscription
    const subscription = supabase
        .channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
            console.log('Change received!', payload);
            callback(payload); // Pass the payload to the callback for granular updates
        })
        .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
};

export const subscribeToProduct = (id, callback) => {
    const fetchProduct = async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching product:', error);
            callback(null);
        } else {
            callback(data);
        }
    };

    fetchProduct();

    const subscription = supabase
        .channel(`public:products:id=eq.${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `id=eq.${id}` }, (payload) => {
            fetchProduct();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
};
