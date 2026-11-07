const state = {
    server: '', username: '', password: '',
    streams: [], // Hier liegen ALLE Filme der aktuell gewählten Kategorie
    displayedCount: 0, // Wie viele sind gerade auf dem Bildschirm?
    chunkSize: 50 // Lade immer 50 Stück auf einmal
};

const setupScreen = document.getElementById('setup-screen');
const appScreen = document.getElementById('app-screen');
const categoryList = document.getElementById('category-list');
const movieGrid = document.getElementById('movie-grid');
const loadMoreBtn = document.getElementById('load-more');

// Login prüfen
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('xtream_auth');
    if (saved) {
        const auth = JSON.parse(saved);
        state.server = auth.server; state.username = auth.username; state.password = auth.password;
        initApp();
    }
});

document.getElementById('btn-connect').addEventListener('click', () => {
    state.server = document.getElementById('xtream-url').value.replace(/\/$/, "");
    state.username = document.getElementById('xtream-user').value;
    state.password = document.getElementById('xtream-pass').value;
    if (state.server && state.username && state.password) {
        localStorage.setItem('xtream_auth', JSON.stringify(state));
        initApp();
    }
});

async function initApp() {
    setupScreen.classList.remove('active');
    appScreen.classList.add('active');
    // Lade nur die Kategorien (das ist eine kleine Liste, kein Problem)
    try {
        const res = await fetch(`${state.server}/player_api.php?username=${state.username}&password=${state.password}&action=get_vod_categories`);
        const cats = await res.json();
        renderCategories(cats);
    } catch (e) { alert("Verbindungsfehler. Prüfen Sie die Zugangsdaten."); }
}

function renderCategories(cats) {
    categoryList.innerHTML = '';
    cats.forEach(cat => {
        const li = document.createElement('li');
        li.textContent = cat.category_name;
        li.setAttribute('tabindex', '0'); // Macht es mit der Fernbedienung anwählbar
        li.addEventListener('click', () => loadCategory(cat.category_id, cat.category_name));
        categoryList.appendChild(li);
    });
}

async function loadCategory(catId, catName) {
    document.getElementById('current-category-title').textContent = catName;
    movieGrid.innerHTML = '<p style="color:white;">Lade Filme (kann einen Moment dauern)...</p>';
    state.displayedCount = 0;
    
    // Hier laden wir die Filme NUR für diese Kategorie
    try {
        const res = await fetch(`${state.server}/player_api.php?username=${state.username}&password=${state.password}&action=get_vod_streams&category_id=${catId}`);
        state.streams = await res.json(); // Alle Filme dieser Kategorie im Speicher
        movieGrid.innerHTML = ''; // Ladeanzeige löschen
        loadMoreMovies(); // Die ersten 50 anzeigen
    } catch (e) {
        movieGrid.innerHTML = '<p style="color:red;">Fehler beim Laden der Filme.</p>';
    }
}

// Die Funktion, die verhindert, dass der TV einfriert!
function loadMoreMovies() {
    // Nimm die nächsten 50 Filme aus dem Speicher
    const nextChunk = state.streams.slice(state.displayedCount, state.displayedCount + state.chunkSize);
    
    nextChunk.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.setAttribute('tabindex', '0'); // WICHTIG für Fernbedienung!
        
        const img = document.createElement('img');
        img.src = movie.stream_icon || 'https://via.placeholder.com/180x270?text=Kein+Bild';
        img.loading = 'lazy'; // Lädt Bilder erst, wenn man hinscrollt
        
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = movie.name;

        card.appendChild(img); card.appendChild(title);
        
        // Wenn man mit der Fernbedienung auf den Film geht, soll er nachladen
        card.addEventListener('focus', () => {
            // Wenn wir uns den letzten 10 Filmen nähern, lade die nächsten 50
            if (state.displayedCount > 0 && movieGrid.lastChild === card) {
                if (state.displayedCount < state.streams.length) {
                    loadMoreMovies();
                }
            }
        });

        card.addEventListener('click', () => playMovie(movie.stream_id, movie.container_extension));
        movieGrid.appendChild(card);
    });
    state.displayedCount += state.chunkSize;
}

function playMovie(id, ext) {
    const url = `${state.server}/movie/${state.username}/${state.password}/${id}.${ext}`;
    alert("Spiele ab: " + url + "\n(In TizenBrew würde hier der Player starten)");
}
