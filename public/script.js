// DOM Elements
const findBtn = document.getElementById("find-btn");
const randomBtn = document.getElementById("random-btn");
const searchInput = document.getElementById("search");
const resultsContainer = document.getElementById("results");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const closeModal = document.querySelector(".close");
const tabs = document.querySelectorAll(".tab");

// State
let searchHistory = JSON.parse(localStorage.getItem("cocktailSearchHistory")) || [];

// Event Listeners
findBtn.addEventListener("click", findCocktail);
randomBtn.addEventListener("click", getRandomCocktail);
searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") findCocktail();
});
closeModal.addEventListener("click", () => modal.style.display = "none");
window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
});

async function isFavorite(id) {
    try {
        const response = await fetch('/api/favorites');
        const favorites = await response.json();
        return favorites.some(fav => fav.idDrink === id);
    } catch (error) {
        console.error("Error checking favorites:", error);
        return false;
    }
}

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        
        switch(tab.dataset.tab) {
            case "search":
                // Show search results
                break;
            case "favorites":
                loadFavorites();
                break;
            case "history":
                showSearchHistory();
                break;
        }
    });
});

// Functions
async function findCocktail() {
    const query = searchInput.value.trim();
    if (!query) {
        showMessage("Please enter a cocktail name.");
        return;
    }

    // Add to search history
    if (!searchHistory.includes(query)) {
        searchHistory.unshift(query);
        localStorage.setItem("cocktailSearchHistory", JSON.stringify(searchHistory));
    }

    showLoading();

    try {
        const response = await fetch(`/api/search?query=${query}`);
        const data = await response.json();
        
        if (!data.drinks) {
            showMessage("No cocktails found. Try another name!");
            return;
        }

        displayCocktails(data.drinks);
    } catch (error) {
        showMessage("Something went wrong. Please try again.");
        console.error(error);
    }
}

async function getRandomCocktail() {
    showLoading();
    try {
        const response = await fetch('/api/random');
        const data = await response.json();
        displayCocktails(data.drinks);
    } catch (error) {
        showMessage("Failed to get random cocktail. Please try again.");
        console.error(error);
    }
}

async function loadFavorites() {
    showLoading();
    try {
        const response = await fetch('/api/favorites');
        const favorites = await response.json();
        
        if (favorites.length === 0) {
            showMessage("You haven't saved any favorites yet!");
            return;
        }

        displayCocktails(favorites);
    } catch (error) {
        showMessage("Failed to load favorites. Please try again.");
        console.error(error);
    }
}

function showSearchHistory() {
    if (searchHistory.length === 0) {
        showMessage("Your search history is empty.");
        return;
    }

    resultsContainer.innerHTML = `
        <div class="history-list">
            <h2>Your Recent Searches</h2>
            <ul>
                ${searchHistory.map(term => `
                    <li>
                        <button class="history-term">${term}</button>
                        <button class="delete-term">&times;</button>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    // Add event listeners to history terms
    document.querySelectorAll(".history-term").forEach(btn => {
        btn.addEventListener("click", (e) => {
            searchInput.value = e.target.textContent;
            findCocktail();
            document.querySelector('[data-tab="search"]').click();
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-term").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const term = e.target.previousElementSibling.textContent;
            searchHistory = searchHistory.filter(t => t !== term);
            localStorage.setItem("cocktailSearchHistory", JSON.stringify(searchHistory));
            e.target.parentElement.remove();
            
            if (searchHistory.length === 0) {
                showMessage("Your search history is empty.");
            }
        });
    });
}

function displayCocktails(cocktails) {
    resultsContainer.innerHTML = '';
    
    cocktails.forEach(drink => {
        const card = document.createElement('div');
        card.className = "cocktail-card";
        card.innerHTML = `
            <img src="${drink.strDrinkThumb}" alt="${drink.strDrink}">
            <div class="cocktail-card-content">
                <h2>${drink.strDrink}</h2>
                <p>${(drink.strInstructions || '').slice(0, 100)}...</p>
                <button class="view-details" data-id="${drink.idDrink}">View Details</button>
                <button class="favorite-btn" data-id="${drink.idDrink}">
                    <i class="far fa-star"></i>
                </button>
            </div>
        `;
        resultsContainer.appendChild(card);
    });

    // Add event listeners to detail buttons
    document.querySelectorAll(".view-details").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.target.dataset.id;
            showCocktailDetails(id);
        });
    });

    // Add event listeners to favorite buttons
    document.querySelectorAll(".favorite-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const id = e.target.closest("button").dataset.id;
            const cocktail = cocktails.find(d => d.idDrink === id);
            
            try {
                if (e.target.closest("button").classList.contains("favorited")) {
                    // Remove from favorites
                    await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
                    e.target.closest("button").classList.remove("favorited");
                    e.target.innerHTML = '<i class="far fa-star"></i>';
                } else {
                    // Add to favorites
                    const response = await fetch('/api/favorites', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cocktail)
                    });
                    
                    if (response.ok) {
                        e.target.closest("button").classList.add("favorited");
                        e.target.innerHTML = '<i class="fas fa-star"></i>';
                    }
                }
            } catch (error) {
                console.error("Failed to update favorites", error);
            }
        });
    });
}



async function showCocktailDetails(id) {
    showLoading(true);
    try {
        const response = await fetch(`/api/cocktail/${id}`);
        const data = await response.json();
        
        if (!data.drinks) {
            showMessage("Couldn't load cocktail details.");
            return;
        }

        const drink = data.drinks[0];
        
        // Get ingredients and measures
        const ingredients = [];
        for (let i = 1; i <= 15; i++) {
            const ingredient = drink[`strIngredient${i}`];
            const measure = drink[`strMeasure${i}`];
            if (ingredient) {
                ingredients.push({
                    ingredient,
                    measure: measure || ''
                });
            }
        }

        // Check if this cocktail is favorited
        const favoritesResponse = await fetch('/api/favorites');
        const favorites = await favoritesResponse.json();
        const isFavorited = favorites.some(fav => fav.idDrink === drink.idDrink);

        // Create modal content
        modalBody.innerHTML = `
            <div class="cocktail-detail">
                <div class="cocktail-detail-header">
                    <img src="${drink.strDrinkThumb}" alt="${drink.strDrink}">
                    <div class="cocktail-detail-info">
                        <h2>${drink.strDrink}</h2>
                        <p><strong>Category:</strong> ${drink.strCategory}</p>
                        <p><strong>Glass:</strong> ${drink.strGlass}</p>
                        <p><strong>Alcoholic:</strong> ${drink.strAlcoholic}</p>
                        <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-id="${drink.idDrink}">
                            <i class="${isFavorited ? 'fas' : 'far'} fa-star"></i>
                            ${isFavorited ? 'Favorited' : 'Add to Favorites'}
                        </button>
                    </div>
                </div>
                
                <div>
                    <h3>Ingredients</h3>
                    <div class="ingredients-list">
                        ${ingredients.map(item => `
                            <div class="ingredient-item">
                                ${item.ingredient}${item.measure ? ` - ${item.measure}` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <h3>Instructions</h3>
                    <p>${drink.strInstructions}</p>
                </div>
            </div>
        `;

        // Add event listener to favorite button in modal
        const favBtn = modalBody.querySelector(".favorite-btn");
        favBtn.addEventListener("click", async (e) => {
            try {
                if (favBtn.classList.contains("favorited")) {
                    // Remove from favorites
                    await fetch(`/api/favorites/${drink.idDrink}`, { method: 'DELETE' });
                    favBtn.classList.remove("favorited");
                    favBtn.innerHTML = '<i class="far fa-star"></i> Add to Favorites';
                } else {
                    // Add to favorites
                    const response = await fetch('/api/favorites', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(drink)
                    });
                    
                    if (response.ok) {
                        favBtn.classList.add("favorited");
                        favBtn.innerHTML = '<i class="fas fa-star"></i> Favorited';
                    }
                }
            } catch (error) {
                console.error("Failed to update favorites", error);
            }
        });

        modal.style.display = "block";
    } catch (error) {
        showMessage("Failed to load cocktail details.");
        console.error(error);
    }
}

function showLoading(inModal = false) {
    if (inModal) {
        modalBody.innerHTML = '<div class="loading">Loading...</div>';
    } else {
        resultsContainer.innerHTML = '<div class="loading">Loading...</div>';
    }
}

function showMessage(message) {
    resultsContainer.innerHTML = `<p class="message">${message}</p>`;
}

// Initialize
document.querySelector('[data-tab="search"]').click();


