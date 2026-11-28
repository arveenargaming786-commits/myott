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
    <p id="gate_err"></p>`;
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
      unlocked.add(key);
    }
    playEpisode(c, n);
  }

  function playEpisode(c, n){
    const total = epCount(c);
    const url = (c.episodes && c.episodes[n - 1]) || c.video || SAMPLE_VIDEO;
    openModal(`<h3>${c.title}</h3><p class="muted">एपिसोड ${n} / ${total}</p>
      <video id="epv" src="${url}" controls autoplay playsinline></video>
      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="btn ghost" style="flex:1" data-ads="list">☰ सभी एपिसोड</button>
        ${n < total ? '<button class="btn red" style="flex:1" data-ads="next">अगला ▶</button>' : ''}
      </div>`);
    bindAds({list: () => epList(c), next: () => startEpisode(c, n + 1)});
    const v = document.getElementById('epv');
    if(v) v.onended = () => { if(n < total) toast('अगला एपिसोड: "अगला ▶" दबाएँ'); };
  }

  /* कार्ड दबाने पर: एपिसोड वाला कंटेंट = सूची, फिल्म = सीधा प्ले */
  open = function(id){
    const c = [...DATA, ...MICRO].find(x => x.id == id);
    if(!c) return;
    if(epCount(c)) return epList(c);
    play(c);
  };

  render();
})();
