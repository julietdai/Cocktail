const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Path to favorites file
const FAVORITES_FILE = path.join(__dirname, 'favorites.json');

// Initialize favorites file if it doesn't exist
if (!fs.existsSync(FAVORITES_FILE)) {
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify([]));
}

// Proxy endpoint to CocktailDB API
app.get('/api/search', async (req, res) => {
    try {
        const { query } = req.query;
        const response = await axios.get(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${query}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cocktails' });
    }
});

// Get random cocktail
app.get('/api/random', async (req, res) => {
    try {
        const response = await axios.get('https://www.thecocktaildb.com/api/json/v1/1/random.php');
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch random cocktail' });
    }
});

// Get cocktail by ID
app.get('/api/cocktail/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cocktail details' });
    }
});

// Get favorites
app.get('/api/favorites', (req, res) => {
    try {
        const favorites = JSON.parse(fs.readFileSync(FAVORITES_FILE));
        res.json(favorites);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load favorites' });
    }
});

// Add to favorites
app.post('/api/favorites', (req, res) => {
    try {
        const favorites = JSON.parse(fs.readFileSync(FAVORITES_FILE));
        const newFavorite = req.body;
        
        // Check if already favorited
        if (!favorites.some(fav => fav.idDrink === newFavorite.idDrink)) {
            favorites.push(newFavorite);
            fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favorites, null, 2));
            res.status(201).json(newFavorite);
        } else {
            res.status(400).json({ error: 'Cocktail already in favorites' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to add favorite' });
    }
});

// Remove from favorites
app.delete('/api/favorites/:id', (req, res) => {
    try {
        const { id } = req.params;
        let favorites = JSON.parse(fs.readFileSync(FAVORITES_FILE));
        
        favorites = favorites.filter(fav => fav.idDrink !== id);
        fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favorites, null, 2));
        
        res.status(200).json({ message: 'Favorite removed' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove favorite' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});