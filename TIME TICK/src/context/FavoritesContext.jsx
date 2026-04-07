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
        let newFavs;

        if (currentUser) {
            // DATABASE MODE
            try {
                if (isFav) {
                    const { error } = await supabase
                        .from('favorites')
                        .delete()
                        .eq('user_id', currentUser.uid)
                        .eq('product_id', String(product.id));
                    if (error) throw error;
                    newFavs = favorites.filter(fav => String(fav.id) !== String(product.id));
                } else {
                    const { error } = await supabase
                        .from('favorites')
                        .insert({
                            user_id: currentUser.uid,
                            product_id: String(product.id),
                            product_data: product
                        });
                    if (error) throw error;
                    newFavs = [...favorites, product];
                }
                setFavorites(newFavs);
            } catch (err) {
                console.error("Failed to update theater favorite:", err);
            }
        } else {
            // GUEST MODE (LOCAL)
            if (isFav) {
                newFavs = favorites.filter(fav => String(fav.id) !== String(product.id));
            } else {
                newFavs = [...favorites, product];
            }
            setFavorites(newFavs);
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
