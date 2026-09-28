const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

const oldLogo = `<Link href="/?category=all" onClick={() => setSearchTerm('')} className="text-2xl md:text-3xl font-bold text-[#E50914] cursor-pointer flex-shrink-0" style={{ fontFamily: 'Arial, sans-serif' }}>
            NETFLIX
          </Link>`;

const newLogo = `<Link href="/?category=all" onClick={() => setSearchTerm('')} className="cursor-pointer flex-shrink-0" aria-label="Netflix">
            <svg viewBox="0 0 111 30" className="w-[85px] md:w-[111px] h-[24px] md:h-[30px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M105.062 14.28L111 30C104.5 28.52 98.423 27.23 93 26.23L98.549 11.4L93.001 0H100.222L105.062 14.28ZM77.016 23.3C77.016 23.3 72.844 22.56 68.618 21.84L75.311 0H82.47L77.016 23.3ZM50.088 20.25C54.103 20.89 57.653 21.46 60.103 21.84L58.261 27.21C55.626 26.85 52.022 26.33 48.163 25.75L41.353 24.64L46.852 0H53.955L50.088 20.25ZM30.407 16.48C33.155 17.06 35.836 17.65 38.358 18.23L36.634 23.63C33.784 22.95 31.066 22.37 28.536 21.8L28.147 23.51C30.648 24 33.141 24.51 35.534 25.04L33.738 30C26.177 28.2 17.159 26.4 17.159 26.4L23.479 0H30.655L30.407 16.48ZM17.135 0L12.561 17.66L3.921 0H0L9.049 30C12.585 29.56 16.035 29.1 19.344 28.62L17.135 0Z" fill="#E50914"/>
            </svg>
          </Link>`;

content = content.replace(oldLogo, newLogo);

fs.writeFileSync('src/components/Navbar.tsx', content);
