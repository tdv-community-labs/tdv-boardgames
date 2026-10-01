const fs = require('fs');
let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

c = c.replace('<span className="text-sm font-bold text-white">{user.displayName || \'Oyun\\uFFFD\\uFFFDu\'}</span>\n                </div>', '<span className="text-sm font-bold text-white">{user.displayName || \'Oyunçu\'}</span>\n                </Link>');

c = c.replace('<span className="text-sm font-bold text-white">{user.displayName || \'Oyunçu\'}</span>\r\n                </div>', '<span className="text-sm font-bold text-white">{user.displayName || \'Oyunçu\'}</span>\r\n                </Link>');

c = c.replace('<span className="text-sm font-bold text-white">{user.displayName || \'Oyun\uFFFDu\'}</span>\r\n                </div>', '<span className="text-sm font-bold text-white">{user.displayName || \'Oyunçu\'}</span>\r\n                </Link>');

c = c.replace(/Oyun\uFFFDu/g, 'Oyunçu');
c = c.replace(/\uFFFD\u0152\uFFFDx\uFFFDY et/g, 'Çıxış et');
c = c.replace(/Giri\uFFFDY/g, 'Giriş');

// Just in case the replace above fails due to whitespace:
c = c.replace(/<\/span>\s*<\/div>\s*<button/g, '</span>\n                </Link>\n                <button');

fs.writeFileSync('src/components/Navbar.tsx', c, 'utf8');
