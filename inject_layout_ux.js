const fs = require('fs');

const file = 'src/app/layout.tsx';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('Toaster')) {
  c = c.replace(
    "export default function RootLayout({",
    "import { Toaster } from 'react-hot-toast';\n\nexport default function RootLayout({"
  );
  c = c.replace(
    "{children}",
    "{children}\n        <Toaster position=\"top-center\" toastOptions={{ style: { background: '#18181b', color: '#fff', border: '1px solid #27272a' } }} />"
  );
  fs.writeFileSync(file, c, 'utf8');
}
