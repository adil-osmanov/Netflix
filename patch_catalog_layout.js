const fs = require('fs');
let content = fs.readFileSync('src/components/ClientCatalog.tsx', 'utf8');

const oldReturn = `  // STANDARD CATEGORY OR HOME VIEW
  return (
    <>
      {categoryParam !== 'all' && heroMovie && (
        <Hero movie={heroMovie} />
      )}
      
      <div className={\`\${categoryParam === 'all' ? 'pt-28 px-4 md:px-12' : '-mt-24 relative z-20 pb-40 px-4 md:px-12 w-full'}\`}>
        {categoryParam === 'all' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-x-2 gap-y-4 md:gap-y-8 pb-40">
            {displayMovies.map((movie) => (
              <div key={movie.id} className="w-full">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        ) : (
          displayGenres.map(genre => (
            <MovieRow 
              key={genre.id} 
              title={genre.name}
              genreId={genre.id}
              movies={displayMovies.filter(m => m.genre_id === genre.id)} 
            />
          ))
        )}
      </div>
    </>
  );
}`;

const newReturn = `  // STANDARD CATEGORY OR HOME VIEW
  if (categoryParam === 'all') {
    return (
      <div className="pt-28 px-4 md:px-12 w-full z-10 relative pb-40">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-x-2 gap-y-4 md:gap-y-8">
          {displayMovies.map((movie) => (
            <div key={movie.id} className="w-full">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Hero movie={heroMovie} />
      <div className="pb-40 relative z-20 mt-4 space-y-8 md:space-y-12">
        {displayGenres.map(genre => (
          <MovieRow 
            key={genre.id} 
            title={genre.name}
            genreId={genre.id}
            movies={displayMovies.filter(m => m.genre_id === genre.id)} 
          />
        ))}
      </div>
    </>
  );
}`;

content = content.replace(oldReturn, newReturn);
fs.writeFileSync('src/components/ClientCatalog.tsx', content);
