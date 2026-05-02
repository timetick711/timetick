import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabase/client';

const FavoritesContext = createContext();

export const useFavorites = () => useContext(FavoritesContext);

export const FavoritesProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // 1. Fetch Favorites from Supabase
    const fetchFavorites = useCallback(async (userId) => {
        if (!userId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;
            
            // Map the rows to our standard product objects
            const favProducts = data.map(item => ({
                ...item.product_data,
                id: item.product_id // Ensure ID consistency
            }));
            setFavorites(favProducts);
        } catch (err) {
            console.error("Error fetching favorites:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Real-time listener for product/favorites deletions
    useEffect(() => {
        const favoritesChannel = supabase
            .channel('favorites_sync_final')
            // Listener 1: Watch products table (direct deletion)
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'products' },
                (payload) => {
                    const deletedId = payload.old?.id;
                    if (!deletedId) return;

                    // Update local state for everyone (Guests & Logged-in)
                    setFavorites(prev => prev.filter(item => {
                        const itemId = String(item.id || item.product_id || '').trim();
                        const targetId = String(deletedId).trim();
                        return itemId !== targetId;
                    }));
                }
            )
            // Listener 2: Watch favorites table (cascade deletion)
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'favorites' },
                (payload) => {
                    const deletedProductId = payload.old?.product_id;
                    if (!deletedProductId) return;
                    
                    // Update local state for everyone
                    setFavorites(prev => prev.filter(item => {
                        const itemId = String(item.id || item.product_id || '').trim();
                        const targetId = String(deletedProductId).trim();
                        return itemId !== targetId;
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(favoritesChannel);
        };
    }, [currentUser]); // fetchFavorites removed from deps as it's no longer called here

    // 2. Merge Local Favorites to Database on Login
    const mergeLocalFavorites = async (userId) => {
        const localFavs = localStorage.getItem('time-tick-favorites');
        if (!localFavs || !userId) return;

        try {
            const parsed = JSON.parse(localFavs);
            if (parsed.length === 0) return;

            const upserts = parsed.map(product => ({
                user_id: userId,
                product_id: String(product.id),
                product_data: product
            }));

            const { error } = await supabase
                .from('favorites')
                .upsert(upserts, { onConflict: 'user_id, product_id' });

            if (error) throw error;
            
            // Clear local storage after successful merge
            localStorage.removeItem('time-tick-favorites');
            await fetchFavorites(userId);
        } catch (err) {
            console.error("Error merging favorites:", err);
        }
    };

    // 3. Initial Load & Auth Sync
    useEffect(() => {
        if (currentUser) {
            // Always fetch from cloud when user is logged in
            fetchFavorites(currentUser.uid);
            // Also attempt to merge any guest favorites
            mergeLocalFavorites(currentUser.uid);
        } else {
            // Load from local storage for guests
            const saved = localStorage.getItem('time-tick-favorites');
            if (saved) {
                setFavorites(JSON.parse(saved));
            } else {
                setFavorites([]);
            }
        }
    }, [currentUser, fetchFavorites]);

    // 4. Persistence Effect (Guests Only)
    useEffect(() => {
        if (!currentUser) {
            localStorage.setItem('time-tick-favorites', JSON.stringify(favorites));
        }
    }, [favorites, currentUser]);

    const toggleFavorite = async (product) => {
        const isFav = favorites.some(fav => String(fav.id) === String(product.id));
        
        // Capture previous state for potential rollback
        const previousFavs = [...favorites];
        
        // Calculate new state immediately
        const newFavs = isFav 
            ? favorites.filter(fav => String(fav.id) !== String(product.id))
            : [...favorites, product];

        // 1. Update UI Immediately (Optimistic Update)
        setFavorites(newFavs);

        // 2. Persist to storage/database in background
        if (currentUser) {
            try {
                if (isFav) {
                    const { error } = await supabase
                        .from('favorites')
                        .delete()
                        .eq('user_id', currentUser.uid)
                        .eq('product_id', String(product.id));
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('favorites')
                        .insert({
                            user_id: currentUser.uid,
                            product_id: String(product.id),
                            product_data: product
                        });
                    if (error) throw error;
                }
            } catch (err) {
                console.error("Failed to sync favorites with database:", err);
                // 3. Rollback on failure
                setFavorites(previousFavs);
                alert("حدث خطأ أثناء مزامنة المفضلة. تم التراجع عن التغيير.");
            }
        } else {
            // Guest mode logic is already handled by the useEffect watching favorites
            localStorage.setItem('time-tick-favorites', JSON.stringify(newFavs));
        }
    };

    const isFavorite = (productId) => favorites.some(fav => String(fav.id) === String(productId));

    return (
        <FavoritesContext.Provider value={{
            favorites,
            toggleFavorite,
            isFavorite,
            isFavoritesOpen,
            setIsFavoritesOpen,
            loading
        }}>
            {children}
        </FavoritesContext.Provider>
    );
};
