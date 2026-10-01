const fs = require('fs');

function fixLogin() {
  const file = 'src/app/login/page.tsx';
  let c = fs.readFileSync(file, 'utf8');

  // Fix garbled strings safely
  c = c.replace(/Xo.*?Y G.*?lmi.*?siniz/, 'Xoş Gəlmişsiniz')
       .replace(/TDV \?ntellektual Liqas.*?na qo.*?ulmaq.*?/, 'TDV İntellektual Liqasına qoşulmaq üçün daxil olun.')
       .replace(/L.*?q.*?b daxil etm.*?lisiniz!/, 'Ləqəb daxil etməlisiniz!')
       .replace(/Bu e-po.*?t art.*?q qeydiyyatdan ke.*?ib\./, 'Bu e-poçt artıq qeydiyyatdan keçib.')
       .replace(/E-po.*?t v.*? ya .*?ifr.*? s.*?hvdir\./, 'E-poçt və ya şifrə səhvdir.')
       .replace(/\?ifr.*? \?n az.*? 6 simvol olmal.*?d.*?r\./, 'Şifrə ən azı 6 simvol olmalıdır.')
       .replace(/X.*?ta ba.*?Y verdi\. Z.*?hm.*?t olmasa yenid.*?n yoxlay.*?n\./, 'Xəta baş verdi. Zəhmət olmasa yenidən yoxlayın.')
       .replace(/\?stifad.*?i Ad.*? \(L.*?q.*?b\)/, 'İstifadəçi Adı (Ləqəb)')
       .replace(/M.*?s.*?l.*?n: R.*?qib_Usta/, 'Məsələn: Rəqib_Usta')
       .replace(/E-Po.*?t \?nvan.*?/, 'E-Poçt Ünvanı')
       .replace(/\?ifr.*?/, 'Şifrə')
       .replace(/Qeydiyyatdan Ke.*?/, 'Qeydiyyatdan Keç')
       .replace(/Hesab.*?n.*?z yoxdur\? /, 'Hesabınız yoxdur? ')
       .replace(/Art.*?q hesab.*?n.*?z var\? /, 'Artıq hesabınız var? ')
       .replace(/Qeydiyyatdan ke.*?in/, 'Qeydiyyatdan keçin');

  // Add DB import
  if (!c.includes('ref, set')) {
    c = c.replace("import { auth } from '@/lib/firebase';", "import { auth, db } from '@/lib/firebase';\nimport { ref, set } from 'firebase/database';");
  }

  // Add DB creation
  if (!c.includes('set(ref(db, `users/')) {
    const dbLogic = `
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        await set(ref(db, \`users/\${userCredential.user.uid}\`), {
          uid: userCredential.user.uid,
          displayName: displayName,
          elo: 1200,
          winRate: "0%",
          wins: 0,
          losses: 0
        });
        router.push('/');`;
    c = c.replace(/const userCredential = await createUserWithEmailAndPassword\(auth, email, password\);\s*await updateProfile\(userCredential\.user, \{ displayName \}\);\s*router\.push\('\/'\);/, dbLogic);
  }

  fs.writeFileSync(file, c, 'utf8');
}

fixLogin();
