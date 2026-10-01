const fs = require('fs');

let css = fs.readFileSync('src/app/globals.css', 'utf8');

if (!css.includes('starfield')) {
  css += `
/* Animated Starfield */
.starfield {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.starfield::before,
.starfield::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.4) 0%, transparent 100%),
    radial-gradient(1px 1px at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 50% 10%, rgba(255,255,255,0.4) 0%, transparent 100%),
    radial-gradient(1px 1px at 70% 80%, rgba(255,255,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 90% 40%, rgba(255,255,255,0.4) 0%, transparent 100%),
    radial-gradient(2px 2px at 15% 70%, rgba(100,200,255,0.3) 0%, transparent 100%),
    radial-gradient(2px 2px at 55% 90%, rgba(200,100,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 80% 15%, rgba(255,200,100,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 25% 35%, rgba(255,255,255,0.2) 0%, transparent 100%),
    radial-gradient(1px 1px at 65% 60%, rgba(255,255,255,0.25) 0%, transparent 100%),
    radial-gradient(1px 1px at 42% 75%, rgba(255,255,255,0.2) 0%, transparent 100%),
    radial-gradient(1px 1px at 88% 25%, rgba(255,255,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 5%  85%, rgba(255,255,255,0.2) 0%, transparent 100%);
  background-size: 100% 100%;
  animation: starfieldDrift 60s linear infinite;
}
.starfield::after {
  animation-delay: -30s;
  opacity: 0.6;
  transform: scale(1.5) rotate(30deg);
}
@keyframes starfieldDrift {
  0%   { transform: translateY(0) translateX(0) rotate(0deg); }
  50%  { transform: translateY(-20px) translateX(10px) rotate(1deg); }
  100% { transform: translateY(0) translateX(0) rotate(0deg); }
}

/* Glowing orbs */
.glow-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.12;
  pointer-events: none;
  z-index: 0;
  animation: orbFloat 15s ease-in-out infinite;
}
@keyframes orbFloat {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(30px,-20px) scale(1.1); }
  66%      { transform: translate(-20px,15px) scale(0.95); }
}
`;
  fs.writeFileSync('src/app/globals.css', css, 'utf8');
}

// Inject starfield into homepage
let page = fs.readFileSync('src/app/page.tsx', 'utf8');
if (!page.includes('starfield')) {
  page = page.replace(
    /return \(\n\s*<main/,
    `return (
    <main`
  );
  page = page.replace(
    /<main className="/,
    `<>
      {/* Animated background */}
      <div className="starfield" aria-hidden="true" />
      <div className="glow-orb w-96 h-96 bg-blue-600 top-1/4 left-1/4" aria-hidden="true" />
      <div className="glow-orb w-80 h-80 bg-purple-600 top-1/2 right-1/4" style={{ animationDelay: '-7s' }} aria-hidden="true" />
      <div className="glow-orb w-64 h-64 bg-emerald-600 bottom-1/4 left-1/3" style={{ animationDelay: '-3s' }} aria-hidden="true" />
      <main className="`
  );

  // Find and close the main/return properly
  // Find last </main> and add </>
  const lastMain = page.lastIndexOf('</main>');
  if (lastMain !== -1) {
    page = page.slice(0, lastMain + 7) + '\n    </>' + page.slice(lastMain + 7);
  }

  fs.writeFileSync('src/app/page.tsx', page, 'utf8');
}
