const fs = require('fs');
let c = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

c = c.replace(/const \[newName, setNewName\] = useState\(''\);/, "const [newName, setNewName] = useState('');\n  const [avatar, setAvatar] = useState('😎');\n  const AVATARS = ['😎','🤖','👽','👻','🐱','🐉','🦄','💀','👑','👾','🤡','🦁'];");

c = c.replace(/setNewName\(statsData\.displayName \|\| user\.displayName \|\| ''\);/, "setNewName(statsData.displayName || user.displayName || '');\n          if (statsData.avatar) setAvatar(statsData.avatar);");

c = c.replace(/await updateProfile\(user, \{ displayName: newName \}\);/, "await updateProfile(user, { displayName: newName });\n      await update(ref(db, \`users/\${user.uid}\`), { avatar: avatar });");

const avatarUI = `
                <div className="my-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block text-left">Profil Şəkli</label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATARS.map(av => (
                      <div 
                        key={av} 
                        onClick={() => setAvatar(av)}
                        className={\`aspect-square flex items-center justify-center text-xl rounded-xl cursor-pointer transition-all \${avatar === av ? 'bg-blue-600 shadow-lg scale-110' : 'bg-zinc-900 hover:bg-zinc-800'}\`}
                      >
                        {av}
                      </div>
                    ))}
                  </div>
                </div>
`;

c = c.replace(/placeholder="Ləqəbiniz"\n\s*\/>/, 'placeholder="Ləqəbiniz"\n                  />\n' + avatarUI);

c = c.replace(/<div className="text-5xl font-black text-white">\{user\.displayName\?\.charAt\(0\) \|\| 'U'\}<\/div>/, '<div className="text-6xl filter drop-shadow-lg">{avatar}</div>');

fs.writeFileSync('src/app/profile/page.tsx', c, 'utf8');
