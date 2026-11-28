/* ScreenBox: लॉगिन-गेट, मुफ़्त मोड (प्रीमियम बंद), एपिसोड + AdMob के इनाम वाले विज्ञापन */
(function(){
  const ADS = {
    FREE_EPS: 4,   // पहले इतने एपिसोड बिना विज्ञापन
    EVERY: 2,      // उसके बाद हर इतने एपिसोड पर देखने से पहले विज्ञापन
    UNIT: 'ca-app-pub-3940256099942544/5224354917',  // Google का टेस्ट विज्ञापन. असली Rewarded ID बनने पर यहाँ बदलें
    TEST: true     // असली ID डालने पर false करें
  };
  const needsAd = n => n > ADS.FREE_EPS && (n - ADS.FREE_EPS - 1) % ADS.EVERY === 0;
  const epCount = c => (c.episodes && c.episodes.length) || (c.type === 'micro' ? Math.min(Number(c.eps) || 0, 100) : 0);
  const unlocked = new Set();
  const plug = name => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name];

  /* ---------- स्टाइल: गेट + प्रीमियम छिपाना ---------- */
  const css = document.createElement('style');
  css.textContent = `
    #seePremium,.cta{display:none!important}
    #pl{position:fixed;inset:0;z-index:170;background:#000;display:flex;flex-direction:column}
    #pl video{flex:1;min-height:0;width:100%;height:100%;max-height:none;margin:0;border-radius:0;object-fit:contain;background:#000}
    #pl .bar{position:absolute;left:0;right:0;z-index:2;display:flex;align-items:center;gap:10px;padding:10px 12px;transition:opacity .25s;background:linear-gradient(rgba(0,0,0,.75),transparent)}
    #pl .bar.top{top:0}
    #pl .bar.bot{bottom:56px;justify-content:center;background:none}
    #pl.hide .bar{opacity:0;pointer-events:none}
    #pl .bar b{flex:1;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #pl .pbtn{background:rgba(0,0,0,.55);border:1px solid rgba(242,165,22,.6);color:#fff;border-radius:12px;padding:8px 14px;font-weight:700;font-size:15px}
    #pl .pbtn.g{background:linear-gradient(180deg,#e0183f,#98102a)}
    .overlay{align-items:flex-start!important;padding-bottom:90px;z-index:160!important}
    #gate .legal{font-size:13px;max-width:300px;margin-top:6px}
    #gate .legal a,footer .legal a{color:var(--gold2);text-decoration:underline;cursor:pointer}
    .modal{margin:auto}
    .overlay:not([hidden]) ~ #adminBtn{display:none}
    #gate{position:fixed;inset:0;z-index:150;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;background:radial-gradient(ellipse at 50% 18%,#4a0814 0,#150508 72%)}
    #gate[hidden]{display:none}
    #gate img{width:76px;height:76px;border-radius:20px;box-shadow:0 0 28px rgba(242,165,22,.45)}
    #gate .wordmark{font-size:30px}
    #gate p{color:var(--muted);font-size:15px}
    #gate .btn{margin-top:20px;padding:12px 24px;display:flex;align-items:center}
    #gate #gate_err{margin-top:6px;font-size:14px;color:#ffb4b4;min-height:20px}`;
  document.head.appendChild(css);

  /* ---------- Google लॉगिन गेट ---------- */
  const gate = document.createElement('div');
  gate.id = 'gate'; gate.hidden = true;
  gate.innerHTML = `<img src="icon-192.png" alt=""><div class="wordmark">ScreenBox</div>
    <p>आपका अपना स्ट्रीमिंग मंच</p>
    <button class="btn light" id="gate_btn"><span class="gmark">G</span>Google से साइन इन करें</button>
    <p id="gate_err"></p>
    <p class="legal">साइन इन करके आप हमारी <a data-legal="terms">नियम व शर्तें</a> और <a data-legal="privacy">प्राइवेसी नीति</a> मानते हैं।</p>`;
  document.body.appendChild(gate);
  const syncGate = () => { gate.hidden = !cloud.ready || !!user; };

  async function googleLogin(){
    const err = document.getElementById('gate_err');
    err.textContent = '';
    try{
      if(isNative){
        const p = plug('FirebaseAuthentication');
        if(!p) throw {code: 'native/plugin-missing'};
        const r = await p.signInWithGoogle();
        const idToken = r && r.credential && r.credential.idToken;
        if(!idToken) throw {code: 'native/no-token'};
        await cloud.auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(idToken));
      }else{
        await cloud.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      }
    }catch(e){
      const c = (e && (e.code || e.message)) || '';
      err.textContent = /cancel|closed/i.test(c) ? 'साइन इन रद्द हुआ' : 'साइन इन नहीं हो पाया: ' + String(c).slice(0, 60);
    }
  }
  document.getElementById('gate_btn').onclick = googleLogin;
  if(cloud.ready){
    cloud.auth.onAuthStateChanged(() => setTimeout(syncGate, 0));
    syncGate();
  }

  /* ---------- कार्ड: सब कुछ मुफ़्त ---------- */
  card = function(c){
    const micro = c.type === 'micro', n = epCount(c);
    const left = n ? n + ' एपिसोड' : c.meta;
    return `<div class="card" data-id="${c.id}">
      <div class="poster ${micro ? 'v' : ''}" style="background:${bg(c)}">
        <span class="badge" ${micro ? 'style="background:var(--pink)"' : ''}>${c.badge}</span>
        <div class="big">${micro ? '🎭' : c.type === 'movie' ? '🎬' : '📺'}</div>
        <div class="pmeta"><span>${left}</span><span>${c.age}</span></div>
      </div>
      <div class="ctitle">
        <div><b>${c.title}</b><small>मुफ़्त देखें</small></div>
        <button class="heart ${favs.includes(c.id) ? 'on' : ''}" data-fav="${c.id}" aria-label="पसंद">${favs.includes(c.id) ? '♥' : '♡'}</button>
      </div>
    </div>`;
  };

  /* ---------- AdMob: इनाम वाला विज्ञापन ---------- */
  let adInit = null;
  function initAds(){
    const p = plug('AdMob');
    if(!p) return Promise.resolve(false);
    if(!adInit) adInit = p.initialize({initializeForTesting: ADS.TEST}).then(() => true).catch(() => false);
    return adInit;
  }
  if(isNative) initAds();

  function demoAd(){
    return new Promise(resolve => {
      let s = 3;
      openModal(`<h3>विज्ञापन (डेमो)</h3><p class="muted">असली ऐप (APK) में यहाँ AdMob का विज्ञापन चलेगा।</p><div class="price" id="adcd">${s}</div>`);
      const t = setInterval(() => {
        s--; const el = document.getElementById('adcd'); if(el) el.textContent = s;
        if(s <= 0){ clearInterval(t); resolve(true); }
      }, 1000);
    });
  }

  /* नतीजा: true = पूरा देखा, false = बीच में बंद किया, 'fail' = विज्ञापन मिला ही नहीं */
  async function showRewarded(){
    const p = plug('AdMob');
    if(!p) return demoAd();
    await initAds();
    let rewarded = false, done = false;
    const subs = [];
    return new Promise(async resolve => {
      const finish = r => {
        if(done) return; done = true;
        subs.forEach(h => { try{ h.remove(); }catch(e){} });
        resolve(r);
      };
      const timer = setTimeout(() => finish('fail'), 25000);
      try{
        subs.push(await p.addListener('onRewardedVideoAdReward', () => { rewarded = true; }));
        subs.push(await p.addListener('onRewardedVideoAdDismissed', () => { clearTimeout(timer); finish(rewarded); }));
        subs.push(await p.addListener('onRewardedVideoAdFailedToShow', () => { clearTimeout(timer); finish('fail'); }));
        await p.prepareRewardVideoAd({adId: ADS.UNIT, isTesting: ADS.TEST});
        clearTimeout(timer);
        await p.showRewardVideoAd();
      }catch(e){ clearTimeout(timer); finish('fail'); }
    });
  }

  /* ---------- एपिसोड सूची + प्लेयर ---------- */
  function bindAds(map){
    document.querySelectorAll('#modal [data-ads]').forEach(el => {
      el.onclick = () => { const f = map[el.dataset.ads]; if(f) f(el.dataset); };
    });
  }

  function epList(c){
    const n = epCount(c);
    openModal(`<h3>${c.title}</h3>
      <p class="muted">${n} एपिसोड • पहले ${ADS.FREE_EPS} मुफ़्त, उसके बाद हर दूसरे एपिसोड से पहले छोटा विज्ञापन</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px">
        ${Array.from({length: n}, (_, i) => i + 1).map(k => `<button class="chip" data-ads="ep" data-n="${k}">${needsAd(k) ? '▶ ' : ''}${k}</button>`).join('')}
      </div>
      <p class="muted" style="margin-top:12px;font-size:13px">▶ = देखने से पहले विज्ञापन</p>`);
    bindAds({ep: d => startEpisode(c, Number(d.n))});
  }

  async function startEpisode(c, n){
    const key = c.id + ':' + n;
    if(needsAd(n) && !unlocked.has(key)){
      const r = await showRewarded();
      if(r === false){ closeModal(); toast('पूरा विज्ञापन देखने पर ही एपिसोड खुलेगा'); return epList(c); }
      if(r === 'fail') toast('विज्ञापन नहीं मिला, एपिसोड खोल रहे हैं');
      if(r === true && plug('AdMob')) bump({adsWatched: 1});
      unlocked.add(key);
    }
    playEpisode(c, n);
  }

  function playEpisode(c, n){
    trackView(c);
    { const k = c.id + ':' + n; if(!seenE.has(k)){ seenE.add(k); bump({ep: [String(c.id), String(n)]}); } }
    const total = epCount(c);
    const url = (c.episodes && c.episodes[n - 1]) || c.video || SAMPLE_VIDEO;
    const btns = [{id: 'list', t: '☰ सभी एपिसोड', f: () => { closePlayer(); epList(c); }}];
    if(n < total) btns.push({id: 'next', t: 'अगला ▶', g: 1, f: () => { closePlayer(); startEpisode(c, n + 1); }});
    showPlayer({title: c.title, sub: 'एपिसोड ' + n + ' / ' + total, url, btns});
  }

  /* ---------- पूरी स्क्रीन वाला प्लेयर ---------- */
  let plHide = null;
  function closePlayer(fromPop){
    const el = document.getElementById('pl');
    if(!el) return;
    try{ const v = el.querySelector('video'); v.pause(); v.removeAttribute('src'); v.load(); }catch(e){}
    try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(e){}
    try{ if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); }catch(e){}
    clearTimeout(plHide);
    el.remove();
    if(!fromPop && history.state && history.state.pl) history.back();
  }
  window.addEventListener('popstate', () => closePlayer(true));

  function showPlayer({title, sub, url, btns}){
    closePlayer();
    const el = document.createElement('div');
    el.id = 'pl';
    el.innerHTML = `<div class="bar top"><button class="pbtn" id="pl_x">✕</button><b>${esc(title)}${sub ? ' • ' + esc(sub) : ''}</b><button class="pbtn" id="pl_fs">⛶</button></div>
      <video src="${url}" controls autoplay playsinline></video>
      <div class="bar bot">${btns.map(b => `<button class="pbtn ${b.g ? 'g' : ''}" data-pb="${b.id}">${b.t}</button>`).join('')}</div>`;
    document.body.appendChild(el);
    try{ history.pushState({pl: 1}, ''); }catch(e){}
    const v = el.querySelector('video');
    const show = () => {
      el.classList.remove('hide'); clearTimeout(plHide);
      plHide = setTimeout(() => { if(!v.paused) el.classList.add('hide'); }, 3000);
    };
    el.addEventListener('pointerdown', show);
    v.addEventListener('play', show);
    v.addEventListener('pause', () => { el.classList.remove('hide'); clearTimeout(plHide); });
    v.addEventListener('ended', () => { el.classList.remove('hide'); clearTimeout(plHide); });
    document.getElementById('pl_x').onclick = () => closePlayer();
    document.getElementById('pl_fs').onclick = async () => {
      try{
        if(document.fullscreenElement){ await document.exitFullscreen(); if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); }
        else{
          await el.requestFullscreen();
          try{ if(v.videoWidth > v.videoHeight && screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); }catch(e){}
        }
      }catch(e){ try{ v.webkitEnterFullscreen && v.webkitEnterFullscreen(); }catch(_){} }
    };
    btns.forEach(b => { const x = el.querySelector('[data-pb="' + b.id + '"]'); if(x) x.onclick = b.f; });
    show();
  }

  /* कार्ड दबाने पर: एपिसोड वाला कंटेंट = सूची, फिल्म = सीधा प्ले */
  open = function(id){
    const c = [...DATA, ...MICRO].find(x => x.id == id);
    if(!c) return;
    if(epCount(c)) return epList(c);
    play(c);
  };

  /* ---------- व्यू / विज्ञापन गिनती (हर यूज़र के अपने दस्तावेज़ में) ---------- */
  function bump(o){
    if(!(cloud.ready && user && user.uid)) return;
    const inc = firebase.firestore.FieldValue.increment;
    const d = {};
    if(o.adsWatched) d.adsWatched = inc(o.adsWatched);
    if(o.view){ d.views = {[o.view]: 1}; }
    if(o.ep){ d.eps = {[o.ep[0]]: {[o.ep[1]]: 1}}; }  // एक ईमेल = एक कंटेंट पर सिर्फ़ 1 व्यू
    cloud.db.collection('users').doc(user.uid).set(d, {merge: true}).catch(() => {});
  }
  const seenV = new Set(), seenE = new Set();
  const trackView = c => { const k = String(c.id); if(seenV.has(k)) return; seenV.add(k); bump({view: k}); };
  play = function(c){
    trackView(c);
    showPlayer({title: c.title, sub: '', url: c.video || SAMPLE_VIDEO, btns: []});
  };

  /* ---------- एडमिन डैशबोर्ड (प्रोफ़ाइल में) ---------- */
  const ADMIN = 'arveenargaming786@gmail.com';
  const isAdm = () => !!(user && user.email && String(user.email).toLowerCase() === ADMIN);
  const inr = n => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  const getRate = () => { try{ return Number(localStorage.getItem('sb_ecpm')) || 150; }catch(e){ return 150; } };

  async function dashboard(){
    openModal('<h3>डैशबोर्ड</h3><p class="muted">लोड हो रहा है...</p>');
    let users = [];
    try{ users = (await cloud.db.collection('users').get()).docs.map(d => d.data()); }
    catch(e){ closeModal(); return toast('डेटा नहीं मिला: Firestore नियम देखें'); }
    const all = [...DATA, ...MICRO];
    const views = {}, epw = {}; let ads = 0, total = 0, epTotal = 0;
    users.forEach(u => {
      ads += Number(u.adsWatched) || 0;
      Object.entries(u.eps || {}).forEach(([k, m]) => { const n = Object.keys(m || {}).length; epw[k] = (epw[k] || 0) + n; epTotal += n; });
      Object.entries(u.views || {}).forEach(([k, v]) => { if(Number(v) > 0){ views[k] = (views[k] || 0) + 1; total++; } });
    });
    const top = Object.entries(views).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = top.length ? top[0][1] : 1;
    const nm = id => { const c = all.find(x => String(x.id) === String(id)); return c ? c.title : 'हटाया हुआ कंटेंट'; };
    const nFilm = all.filter(x => x.type === 'movie').length;
    const nSer = all.filter(x => x.type === 'series').length;
    const nMic = all.filter(x => x.type === 'micro').length;
    const rate = getRate();
    const box = (v, l) => `<div class="plan" style="margin:0;padding:14px;text-align:center"><div style="font-size:28px;font-weight:700;color:var(--gold2)">${v}</div><div class="muted" style="font-size:13px">${l}</div></div>`;
    openModal(`<p class="eyebrow gold">ADMIN</p><h3>नमस्ते, ${esc(user.name)}</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
        ${box(all.length, 'कुल कंटेंट')}${box(users.length, 'कुल सदस्य')}
        ${box(total, 'कुल व्यूज़ (1 ईमेल = 1)')}${box(epTotal, 'एपिसोड देखे गए')}
        ${box(ads, 'विज्ञापन देखे गए')}${box(users.length ? (epTotal / users.length).toFixed(1) : 0, 'प्रति सदस्य एपिसोड')}
      </div>
      <div class="muted" style="font-size:13px;margin-top:8px">फ़िल्में ${nFilm} • सीरीज़ ${nSer} • माइक्रो-ड्रामा ${nMic}</div>

      <div class="plan gold" style="margin-top:16px">
        <h4>💰 अनुमानित कमाई</h4>
        <div class="price">${inr(ads / 1000 * rate)}</div>
        <p class="muted" style="font-size:13px">${ads} विज्ञापन × ₹<input id="ecpm" type="number" value="${rate}" style="width:70px;background:#12060a;color:#fff;border:1px solid rgba(242,165,22,.4);border-radius:8px;padding:2px 6px"> प्रति 1000 विज्ञापन (eCPM, अंदाज़ा)</p>
        <p class="muted" style="font-size:13px;margin-top:6px">असली कमाई AdMob ऐप/वेबसाइट में दिखती है। प्रीमियम से कमाई: ₹0 (अभी बंद)।</p>
      </div>

      <h4 style="margin-top:18px">🔥 सबसे ज़्यादा देखे गए</h4>
      ${top.length ? top.map(([id, v]) => `<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:15px"><span>${esc(nm(id))}</span><b>${v} दर्शक${epw[id] ? ' • ' + epw[id] + ' एपिसोड' : ''}</b></div><div style="height:8px;border-radius:6px;background:#2a0d13;margin-top:4px"><div style="height:8px;border-radius:6px;width:${Math.max(6, v / max * 100)}%;background:linear-gradient(90deg,var(--gold),var(--gold2))"></div></div></div>`).join('')
        : '<p class="muted" style="margin-top:8px">अभी कोई व्यू नहीं। यूज़र के वीडियो देखते ही यहाँ दिखेगा।</p>'}

      <button class="btn red wide" id="d_adm">⚙ एडमिन पैनल (कंटेंट जोड़ें/बदलें)</button>
      <button class="btn ghost wide" style="margin-top:10px" id="d_out">साइन आउट</button>`);
    document.getElementById('ecpm').onchange = e => { try{ localStorage.setItem('sb_ecpm', String(Number(e.target.value) || 150)); }catch(_){} dashboard(); };
    document.getElementById('d_adm').onclick = () => { closeModal(); const b = document.getElementById('adminBtn'); if(b) b.click(); };
    document.getElementById('d_out').onclick = signOut;
  }

  /* ---------- खाता और डेटा हटाना ---------- */
  async function reauth(){
    const u = cloud.auth.currentUser;
    if(isNative){
      const p = plug('FirebaseAuthentication');
      if(!p) throw {code: 'native/plugin-missing'};
      const r = await p.signInWithGoogle();
      const t = r && r.credential && r.credential.idToken;
      if(!t) throw {code: 'native/no-token'};
      await u.reauthenticateWithCredential(firebase.auth.GoogleAuthProvider.credential(t));
    }else{
      await u.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
    }
  }

  function deleteConfirm(){
    openModal(`<h3>खाता हटाएँ?</h3>
      <p class="muted">आपका खाता, पसंद की सूची और देखने की सारी जानकारी हमेशा के लिए हट जाएगी। यह वापस नहीं हो सकेगा।</p>
      <p class="muted" style="margin-top:8px">पुष्टि के लिए आपसे Google से एक बार फिर साइन इन करवाया जाएगा।</p>
      <p id="del_err" style="color:#ffb4b4;font-size:14px;min-height:20px;margin-top:8px"></p>
      <button class="btn red wide" id="del_yes">हाँ, मेरा खाता हटाएँ</button>
      <button class="btn ghost wide" style="margin-top:10px" id="del_no">रद्द करें</button>`);
    document.getElementById('del_no').onclick = closeModal;
    document.getElementById('del_yes').onclick = async () => {
      const err = document.getElementById('del_err'), btn = document.getElementById('del_yes');
      err.textContent = ''; btn.disabled = true;
      try{
        const u = cloud.auth.currentUser;
        if(!u) throw {code: 'no-user'};
        await reauth();
        await cloud.db.collection('users').doc(u.uid).delete();
        await u.delete();
        try{ const p = plug('FirebaseAuthentication'); if(p) await p.signOut(); }catch(e){}
        await signOut();
        toast('आपका खाता और डेटा हटा दिया गया');
      }catch(e){
        btn.disabled = false;
        const c = (e && (e.code || e.message)) || '';
        err.textContent = /cancel|closed/i.test(c) ? 'हटाना रद्द हुआ' : 'नहीं हट पाया: ' + String(c).slice(0, 60) + '। दोबारा कोशिश करें।';
      }
    };
  }

  const delBtnHtml = '<button class="btn ghost wide" style="margin-top:10px;border-color:#b3152e;color:#ffb4b4" id="del_open">🗑 मेरा खाता और डेटा हटाएँ</button>';
  const addDelBtn = () => {
    const m = document.getElementById('modal');
    if(!m || document.getElementById('del_open')) return;
    m.insertAdjacentHTML('beforeend', delBtnHtml);
    document.getElementById('del_open').onclick = deleteConfirm;
  };

  const sb = document.getElementById('signBtn');
  if(sb) sb.onclick = () => {
    if(isAdm()){ dashboard().then(addDelBtn); }
    else{ signInModal(); if(user) addDelBtn(); }
  };

  /* ---------- नियम व शर्तें + प्राइवेसी नीति ---------- */
  const MAIL = 'arveenargaming786@gmail.com';
  const LEGAL = {
    terms: ['नियम व शर्तें', [
      ['सेवा', 'ScreenBox एक मुफ़्त स्ट्रीमिंग ऐप है। इसका कंटेंट सिर्फ़ आपके निजी मनोरंजन के लिए है।'],
      ['खाता', 'ऐप इस्तेमाल करने के लिए Google से साइन इन करना ज़रूरी है। अपने खाते की सुरक्षा आपकी ज़िम्मेदारी है।'],
      ['विज्ञापन', 'ऐप मुफ़्त रखने के लिए कुछ एपिसोड से पहले विज्ञापन दिखाए जाते हैं। वह एपिसोड तभी खुलता है जब विज्ञापन पूरा देखा जाए।'],
      ['कंटेंट के अधिकार', 'ऐप का कंटेंट कॉपीराइट से सुरक्षित है। उसे डाउनलोड करना, कॉपी करना या दोबारा बाँटना मना है।'],
      ['गलत इस्तेमाल', 'ऐप के साथ छेड़छाड़ करने, विज्ञापन में गड़बड़ी करने या नियम तोड़ने पर खाता बंद किया जा सकता है।'],
      ['बदलाव', 'ये शर्तें समय-समय पर बदल सकती हैं। बदलाव के बाद ऐप चलाते रहने का मतलब है कि आप नई शर्तें मानते हैं।'],
      ['शिकायत', 'किसी कंटेंट पर आपत्ति या सवाल हो तो ' + MAIL + ' पर लिखें।']
    ]],
    privacy: ['प्राइवेसी नीति', [
      ['हम क्या जानकारी लेते हैं', 'Google खाते से आपका नाम, ईमेल और फ़ोटो। साथ ही आपकी पसंद, आपने कौन-सा कंटेंट और कितने एपिसोड देखे, और कितने विज्ञापन देखे।'],
      ['क्यों लेते हैं', 'आपका खाता पहचानने, पसंद हर फ़ोन पर साथ रखने और ऐप कैसा चल रहा है यह समझने के लिए।'],
      ['कहाँ रखी जाती है', 'जानकारी Google Firebase के सर्वर पर सुरक्षित रखी जाती है। हम इसे किसी को बेचते नहीं हैं।'],
      ['विज्ञापन', 'ऐप में Google AdMob के विज्ञापन आते हैं। AdMob आपके फ़ोन का विज्ञापन ID इस्तेमाल कर सकता है। इसे फ़ोन की सेटिंग में बंद किया जा सकता है।'],
      ['आपके अधिकार', 'ऐप में प्रोफ़ाइल खोलकर "मेरा खाता और डेटा हटाएँ" दबाने से आपका खाता और सारा डेटा हट जाता है। या ' + MAIL + ' पर लिखें।'],
      ['बच्चे', 'यह ऐप 13 साल से छोटे बच्चों के लिए नहीं है।']
    ]]
  };
  function legalModal(k){
    const [title, secs] = LEGAL[k];
    openModal(`<h3>${title}</h3>` + secs.map(([h, t]) => `<h4 style="margin-top:14px;color:var(--gold2)">${h}</h4><p class="muted" style="font-size:15px">${t}</p>`).join('')
      + `<button class="btn ghost wide" id="lg_ok">ठीक है</button>`);
    document.getElementById('lg_ok').onclick = closeModal;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-legal]');
    if(a){ e.preventDefault(); legalModal(a.dataset.legal); }
  });
  const ft = document.querySelector('footer');
  if(ft){
    const p = document.createElement('p');
    p.className = 'legal'; p.style.marginTop = '10px';
    p.innerHTML = '<a data-legal="terms">नियम व शर्तें</a> • <a data-legal="privacy">प्राइवेसी नीति</a>';
    ft.appendChild(p);
  }

  render();
})();
