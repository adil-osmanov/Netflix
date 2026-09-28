const fs = require('fs');
let content = fs.readFileSync('src/components/ClientCatalog.tsx', 'utf8');

// Fix implicitly any[]
content = content.replace(
  '  let displayGenres = [];\n  let displayMovies = [];',
  '  let displayGenres: any[] = [];\n  let displayMovies: Movie[] = [];'
);

// Fix MovieRow props
const oldMovieRow = `            <MovieRow 
              key={genre.id} 
              genre={genre} 
              movies={displayMovies.filter(m => m.genre_id === genre.id)} 
            />`;
const newMovieRow = `            <MovieRow 
              key={genre.id} 
              title={genre.name}
              genreId={genre.id}
              movies={displayMovies.filter(m => m.genre_id === genre.id)} 
            />`;

content = content.replace(oldMovieRow, newMovieRow);

fs.writeFileSync('src/components/ClientCatalog.tsx', content);
