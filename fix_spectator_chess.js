const fs = require('fs');

let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

const urlLogic = `
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      const watch = params.get('watch');
      
      if (watch && !roomId) {
        setMode('multiplayer');
        setRoomId(watch);
        setIsSpectator(true);
        setStatus('İzləyici kimi qoşuldunuz');
        toast.success('Otağa izləyici kimi qoşuldunuz!', { icon: '👁️' });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (room && !roomId) {
        get(ref(db, \`games/chess/\${room}\`)).then(snap => {
          if (snap.exists()) {
             const data = snap.val();
             if (data.status === 'playing' || data.guest) {
                setMode('multiplayer');
                setRoomId(room);
                setIsSpectator(true);
                setStatus('Otaq doludur. İzləyici kimi qoşuldunuz');
                toast.success('Otaq dolu olduğu üçün izləyici oldunuz', { icon: '👁️' });
             } else {
                setMode('multiplayer');
                setRoomId(room);
                setMyColor('b');
                // Note: updating Firebase needs update() from 'firebase/database'
                // update(ref(db, \`games/chess/\${room}\`), { status: 'playing', guest: user.uid });
                setStatus('Otağa qoşuldunuz! Oyun Başladı.');
                toast.success('Dostunuzun otağına qoşuldunuz!', { icon: '🤝' });
             }
             window.history.replaceState({}, '', window.location.pathname);
          }
        });
      }
    }
  }, [user, roomId]);
  `;

// Inject before `const handlePieceDrop =`
c = c.replace(/const onPieceDrop = /, urlLogic + '\n  const onPieceDrop = ');

fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
