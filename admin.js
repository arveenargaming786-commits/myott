/* ScreenBox: कैटलॉग (Firestore) + एडमिन पैनल. एडमिन = ADMIN_EMAIL वाला Google खाता */
(function(){
  if(!cloud.ready) return;
  const ADMIN_EMAIL = 'arveenargaming786@gmail.com';
  const GRADS = ['linear-gradient(160deg,#0f4c5c,#e36414)','linear-gradient(160deg,#3a1c71,#d76d77)','linear-gradient(160deg,#134e5e,#71b280)','linear-gradient(160deg,#42275a,#734b6d)','linear-gradient(160deg,#7b1e3a,#f2a516)'];
  const BASE_DATA = DATA.slice(), BASE_MICRO = MICRO.slice();
  const col = () => cloud.db.collection('catalog');
  let items = [];

  const isAdmin = () => !!(user && user.email && String(user.email).toLowerCase() === ADMIN_EMAIL);
  const cleanUrl = u => /^https?:\/\//i.test(u || '') ? String(u).trim().replace(/['"()<>\s]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()) : '';
  const errMsg = e => (e && e.code === 'permission-denied') ? 'अनुमति नहीं मिली: Firestore नियम अपडेट करें' : 'गड़बड़ी: ' + String((e && (e.code || e.message)) || '').slice(0, 50);

  function toItem(it){
    const o = {
      id: Number(it.id), type: it.type || 'movie', title: esc(it.title || ''), access: it.access || 'free',
      price: Number(it.price) || 0, badge: esc(it.badge || 'नया'), meta: esc(it.meta || ''), age: esc(it.age || 'U/A 13+'),
      img: cleanUrl(it.img), video: cleanUrl(it.video), featured: !!it.featured,
      g: GRADS[Math.abs(Number(it.id) || 0) % GRADS.length]
    };
    if(o.type === 'micro'){ o.eps = Number(it.eps) || 10; o.freeEps = Number(it.freeEps) || 3; }
    return o;
  }

  function applyCatalog(){
    if(!items.length){
      DATA.splice(0, DATA.length, ...BASE_DATA);
      MICRO.splice(0, MICRO.length, ...BASE_MICRO);
    }else{
      const all = items.map(toItem);
      DATA.splice(0, DATA.length, ...all.filter(x => x.type !== 'micro').sort((a, b) => (b.featured - a.featured) || (a.id - b.id)));
      MICRO.splice(0, MICRO.length, ...all.filter(x => x.type === 'micro').sort((a, b) => a.id - b.id));
    }
    renderFeature(); render();
  }

  async function loadCatalog(){
    try{
      const s = await col().get();
      items = s.docs.map(d => Object.assign({docId: d.id}, d.data()));
      applyCatalog();
    }catch(e){ console.warn('कैटलॉग नहीं मिला', e); }
  }

  /* मुख्य पोस्टर: कंटेंट खाली हो तो छिपा दें */
  renderFeature = function(){
    const sec = document.querySelector('.feature'), c = DATA[0];
    if(!c){ sec.hidden = true; return; }
    sec.hidden = false;
    $('#fposter').style.background = bg(c);
    $('#fbadge').innerHTML = c.badge;
    $('#ftitle').innerHTML = c.title;
    $('#fmeta').innerHTML = c.meta + ' • ' + c.age;
  };
  $('#watchNow').onclick = () => { if(DATA[0]) open(DATA[0].id); };

  /* हर कंटेंट का अपना वीडियो लिंक */
  const _play = play;
  play = function(c, ep){
    if(!c.video) return _play(c, ep);
    openModal(`<h3>${c.title}</h3><p class="muted">${ep ? ('एपिसोड ' + ep + ' • ') : ''}अभी देखें</p>
      <video src="${c.video}" controls autoplay playsinline></video>`);
  };

  /* ---------- एडमिन पैनल ---------- */
  function bind(map){
    document.querySelectorAll('#modal [data-adm]').forEach(el => {
      el.onclick = () => { const f = map[el.dataset.adm]; if(f) f(el.dataset); };
    });
  }
  const typeName = {movie: 'फिल्म', series: 'सीरीज़', micro: 'माइक्रो-ड्रामा'};
  const accName = {free: 'मुफ़्त', ads: 'विज्ञापन', vip: 'VIP', ppv: 'PPV'};

  function adminHome(){
    const rows = items.slice().sort((a, b) => a.id - b.id).map(it => `
      <div class="plan" style="margin-top:10px;padding:14px">
        <b>${esc(it.title)}</b>
        <div class="muted" style="font-size:14px">${typeName[it.type] || ''} • ${accName[it.access] || ''}${it.featured ? ' • ★ मुख्य' : ''}</div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn ghost sm" data-adm="edit" data-id="${esc(it.docId)}">✏️ बदलें</button>
          <button class="btn ghost sm" data-adm="del" data-id="${esc(it.docId)}">🗑 हटाएँ</button>
        </div>
      </div>`).join('');
    openModal(`<p class="eyebrow gold">ADMIN</p><h3>एडमिन पैनल</h3>
      <button class="btn red wide" style="margin-top:14px" data-adm="new">➕ नया कंटेंट जोड़ें</button>
      <button class="btn ghost wide" style="margin-top:10px" data-adm="members">👥 सदस्य</button>
      ${items.length ? '' : '<p class="muted" style="margin-top:14px">कैटलॉग खाली है, अभी डेमो कंटेंट दिख रहा है।</p><button class="btn light wide" style="margin-top:10px" data-adm="seed">डेमो कंटेंट कैटलॉग में डालें</button>'}
      ${rows}`);
    bind({
      new: () => adminForm(),
      members: members,
      seed: seed,
      edit: d => adminForm(items.find(x => x.docId === d.id)),
      del: async d => {
        if(!window.confirm('यह कंटेंट हटाएँ?')) return;
        try{ await col().doc(d.id).delete(); await loadCatalog(); toast('हट गया'); adminHome(); }
        catch(e){ toast(errMsg(e)); }
      }
    });
  }

  async function seed(){
    try{
      const b = cloud.db.batch();
      BASE_DATA.concat(BASE_MICRO).forEach(c => {
        b.set(col().doc(String(c.id)), {
          id: c.id, type: c.type, title: c.title, access: c.access || 'free', price: c.price || 0,
          badge: c.badge || '', meta: c.meta || '', age: c.age || '', img: '', video: '',
          eps: c.eps || 0, freeEps: c.freeEps || 0, featured: c.id === 1
        });
      });
      await b.commit(); await loadCatalog(); toast('डेमो कंटेंट जुड़ गया'); adminHome();
    }catch(e){ toast(errMsg(e)); }
  }

  function adminForm(it){
    it = it || {};
    const fld = (id, label, val, ph, type) => `<label class="muted" style="font-size:13px;display:block;margin-top:12px">${label}</label>
      <input class="input" style="margin-top:4px" id="${id}" type="${type || 'text'}" value="${esc(val == null ? '' : val)}" placeholder="${esc(ph || '')}">`;
    const sel = (id, label, opts, cur) => `<label class="muted" style="font-size:13px;display:block;margin-top:12px">${label}</label>
      <select class="input" style="margin-top:4px" id="${id}">${opts.map(o => `<option value="${o[0]}" ${o[0] === cur ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    openModal(`<h3>${it.docId ? 'बदलाव करें' : 'नया कंटेंट'}</h3>
      ${sel('f_type', 'किस तरह का', [['movie', 'फिल्म'], ['series', 'सीरीज़'], ['micro', 'माइक्रो-ड्रामा']], it.type || 'movie')}
      ${fld('f_title', 'नाम', it.title, 'कंटेंट का नाम')}
      ${sel('f_access', 'कौन देख सकता है', [['free', 'मुफ़्त'], ['ads', 'विज्ञापन समर्थित'], ['vip', 'VIP सब्सक्रिप्शन'], ['ppv', 'PPV (किराया)']], it.access || 'free')}
      ${fld('f_price', 'किराया ₹ (सिर्फ़ PPV के लिए)', it.price || '', '49', 'number')}
      ${fld('f_badge', 'बैज', it.badge, 'जैसे: नया, ट्रेंडिंग #1')}
      ${fld('f_meta', 'जानकारी', it.meta, 'जैसे: सीज़न 1 • 8 एपिसोड')}
      ${fld('f_age', 'उम्र', it.age, 'U/A 16+')}
      ${fld('f_img', 'पोस्टर फ़ोटो का लिंक', it.img, 'https://...')}
      ${fld('f_video', 'वीडियो का सीधा लिंक (.mp4)', it.video, 'https://...')}
      ${fld('f_eps', 'कुल एपिसोड (सिर्फ़ माइक्रो-ड्रामा)', it.eps || '', '42', 'number')}
      ${fld('f_free', 'मुफ़्त एपिसोड (सिर्फ़ माइक्रो-ड्रामा)', it.freeEps || '', '3', 'number')}
      <label style="display:flex;gap:8px;align-items:center;margin-top:14px"><input type="checkbox" id="f_feat" ${it.featured ? 'checked' : ''}> मुख्य पोस्टर (सबसे ऊपर बड़ा)</label>
      <button class="btn red wide" data-adm="save">सेव करें</button>
      <button class="btn ghost wide" style="margin-top:10px" data-adm="back">रद्द</button>`);
    bind({
      back: adminHome,
      save: async () => {
        const v = id => document.getElementById(id).value.trim();
        const type = v('f_type'), title = v('f_title');
        if(!title) return toast('नाम लिखें');
        const id = it.docId ? Number(it.docId) : Date.now();
        try{
          await col().doc(String(id)).set({
            id, type, title, access: type === 'micro' ? 'free' : v('f_access'), price: Number(v('f_price')) || 0,
            badge: v('f_badge'), meta: v('f_meta'), age: v('f_age') || 'U/A 13+', img: v('f_img'), video: v('f_video'),
            eps: Number(v('f_eps')) || 0, freeEps: Number(v('f_free')) || 0,
            featured: document.getElementById('f_feat').checked
          });
          await loadCatalog(); toast('सेव हो गया'); adminHome();
        }catch(e){ toast(errMsg(e)); }
      }
    });
  }

  async function members(){
    openModal('<h3>सदस्य</h3><p class="muted">लोड हो रहा है...</p>');
    try{
      const s = await cloud.db.collection('users').get();
      const rows = s.docs.map(d => Object.assign({uid: d.id}, d.data())).map(r => `
        <div class="plan" style="margin-top:10px;padding:14px">
          <b>${esc(r.name || '')}</b>
          <div class="muted" style="font-size:14px;word-break:break-all">${esc(r.email || '')}</div>
          ${r.premium ? '<div class="gold" style="margin-top:6px">♛ प्रीमियम</div>'
            : `<button class="btn light sm" style="margin-top:10px" data-adm="grant" data-uid="${esc(r.uid)}">♛ प्रीमियम दें</button>`}
        </div>`).join('');
      openModal(`<h3>सदस्य (${s.size})</h3>${rows || '<p class="muted">अभी कोई सदस्य नहीं।</p>'}
        <button class="btn ghost wide" style="margin-top:14px" data-adm="back">← वापस</button>`);
      bind({
        back: adminHome,
        grant: async d => {
          try{ await cloud.db.collection('users').doc(d.uid).set({premium: true}, {merge: true}); toast('प्रीमियम दे दिया'); members(); }
          catch(e){ toast(errMsg(e)); }
        }
      });
    }catch(e){ closeModal(); toast(errMsg(e)); }
  }

  function mountAdminBtn(){
    let b = document.getElementById('adminBtn');
    if(isAdmin()){
      if(!b){
        b = document.createElement('button');
        b.id = 'adminBtn'; b.className = 'btn light sm'; b.textContent = '⚙ एडमिन';
        b.style.cssText = 'position:fixed;left:14px;bottom:18px;z-index:60;box-shadow:0 6px 24px rgba(0,0,0,.5)';
        b.onclick = adminHome;
        document.body.appendChild(b);
      }
    }else if(b){ b.remove(); }
  }

  cloud.auth.onAuthStateChanged(() => { mountAdminBtn(); setTimeout(mountAdminBtn, 600); });
  mountAdminBtn();
  loadCatalog();
})();
