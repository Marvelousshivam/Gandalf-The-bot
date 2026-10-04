const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data, ttl = CACHE_TTL_MS) {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

function getApiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error('TMDB_API_KEY is not configured in .env file.');
  }
  return key;
}

async function fetchJsonWithRetry(url, options = {}) {
  const retries = options.retries !== undefined ? options.retries : 2;
  const delayMs = options.delayMs || 300;
  const timeoutMs = options.timeoutMs || 8000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GandalfTheBOT/1.0'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
}

const GENRES = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  scifi: 878,
  'sci-fi': 878,
  sciencefiction: 878,
  thriller: 53,
  war: 10752,
  western: 37
};

function formatRuntime(minutes) {
  if (!minutes || isNaN(minutes)) return 'N/A';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function getPosterUrl(path, size = 'w500') {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

function getBackdropUrl(path, size = 'w1280') {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Searches TMDB for movies matching a text query
 */
async function searchMovies(query, page = 1) {
  if (!query || typeof query !== 'string' || !query.trim()) return [];

  const trimmed = query.trim();
  const cacheKey = `search:${trimmed.toLowerCase()}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  const url = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(trimmed)}&page=${page}&include_adult=false`;

  try {
    const data = await fetchJsonWithRetry(url, { retries: 1, timeoutMs: 2500 });
    const results = (data.results || []).map(m => ({
      id: m.id,
      title: m.title,
      original_title: m.original_title,
      year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
      release_date: m.release_date || null,
      vote_average: m.vote_average ? Number(m.vote_average.toFixed(1)) : 0,
      poster_path: m.poster_path,
      poster_url: getPosterUrl(m.poster_path),
      backdrop_path: m.backdrop_path,
      backdrop_url: getBackdropUrl(m.backdrop_path),
      overview: m.overview || 'No overview available.'
    }));

    setCached(cacheKey, results, 5 * 60 * 1000);
    return results;
  } catch (err) {
    console.error('TMDB search fetch failed:', err.message);
    return [];
  }
}

/**
 * Fetches full movie details including credits (director/cast) and videos (trailer)
 */
async function getMovieDetails(movieId) {
  if (!movieId) return null;

  const cacheKey = `movie:${movieId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&append_to_response=videos,credits`;

  try {
    const data = await fetchJsonWithRetry(url);

    // Director
    let director = 'Unknown';
    if (data.credits && data.credits.crew) {
      const dirObj = data.credits.crew.find(c => c.job === 'Director');
      if (dirObj) director = dirObj.name;
    }

    // Top Cast (up to 4 members)
    let cast = [];
    if (data.credits && data.credits.cast) {
      cast = data.credits.cast.slice(0, 4).map(c => c.name);
    }

    // Official Trailer
    let trailer = null;
    if (data.videos && data.videos.results) {
      const official = data.videos.results.find(
        v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      );
      if (official) {
        trailer = {
          name: official.name,
          key: official.key,
          url: `https://www.youtube.com/watch?v=${official.key}`
        };
      }
    }

    const movie = {
      id: data.id,
      title: data.title,
      original_title: data.original_title,
      tagline: data.tagline || '',
      overview: data.overview || 'No synopsis provided.',
      release_date: data.release_date || null,
      year: data.release_date ? data.release_date.split('-')[0] : 'N/A',
      runtime: data.runtime || 0,
      runtime_formatted: formatRuntime(data.runtime),
      vote_average: data.vote_average ? Number(data.vote_average.toFixed(1)) : 0,
      vote_count: data.vote_count || 0,
      genres: (data.genres || []).map(g => g.name),
      director,
      cast,
      trailer,
      poster_path: data.poster_path,
      poster_url: getPosterUrl(data.poster_path),
      backdrop_path: data.backdrop_path,
      backdrop_url: getBackdropUrl(data.backdrop_path),
      imdb_id: data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}` : null,
      tmdb_url: `https://www.themoviedb.org/movie/${data.id}`
    };

    setCached(cacheKey, movie, 15 * 60 * 1000);
    return movie;
  } catch (err) {
    console.error('TMDB getMovieDetails fetch failed:', err.message);
    return null;
  }
}

/**
 * Fetches trending movies this week
 */
async function getTrendingMovies(timeWindow = 'week') {
  const cacheKey = `trending:${timeWindow}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  const url = `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${apiKey}`;

  try {
    const data = await fetchJsonWithRetry(url);
    const results = (data.results || []).map(m => ({
      id: m.id,
      title: m.title,
      year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
      vote_average: m.vote_average ? Number(m.vote_average.toFixed(1)) : 0,
      poster_path: m.poster_path,
      poster_url: getPosterUrl(m.poster_path),
      backdrop_url: getBackdropUrl(m.backdrop_path),
      overview: m.overview
    }));

    setCached(cacheKey, results, 30 * 60 * 1000);
    return results;
  } catch (err) {
    console.error('TMDB getTrendingMovies failed:', err.message);
    return [];
  }
}

/**
 * Discovers movies by genre
 */
async function discoverMovies({ genreId, minRating = 6.5, page = 1 } = {}) {
  const apiKey = getApiKey();
  let url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&include_adult=false&sort_by=vote_count.desc&page=${page}&vote_average.gte=${minRating}`;
  if (genreId) {
    url += `&with_genres=${genreId}`;
  }

  try {
    const data = await fetchJsonWithRetry(url);
    return (data.results || []).map(m => ({
      id: m.id,
      title: m.title,
      year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
      vote_average: m.vote_average ? Number(m.vote_average.toFixed(1)) : 0,
      poster_path: m.poster_path,
      poster_url: getPosterUrl(m.poster_path),
      backdrop_url: getBackdropUrl(m.backdrop_path),
      overview: m.overview
    }));
  } catch (err) {
    console.error('TMDB discoverMovies failed:', err.message);
    return [];
  }
}

module.exports = {
  searchMovies,
  getMovieDetails,
  getTrendingMovies,
  discoverMovies,
  getPosterUrl,
  getBackdropUrl,
  formatRuntime,
  GENRES
};
