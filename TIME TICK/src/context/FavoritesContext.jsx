import { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';


const FavoritesContext = createContext();

export const useFavorites = () => useContext(FavoritesContext);

export const FavoritesProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

    // Sync with LocalStorage (Simplified)
    useEffect(() => {
        const saved = localStorage.getItem('time-tick-favorites');
        if (saved) {
            setFavorites(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('time-tick-favorites', JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = async (product) => {
        const isFav = favorites.some(fav => fav.id === product.id);
        let newFavs;

        if (isFav) {
            newFavs = favorites.filter(fav => fav.id !== product.id);
        } else {
            newFavs = [...favorites, product];
        }

        setFavorites(newFavs);
    };

    const isFavorite = (productId) => favorites.some(fav => fav.id === productId);

    return (
        <FavoritesContext.Provider value={{
            favorites,
            toggleFavorite,
            isFavorite,
            isFavoritesOpen,
            setIsFavoritesOpen
        }}>
            {children}
        </FavoritesContext.Provider>
    );
};
