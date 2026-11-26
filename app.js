/* Pardaa — डेटा नीचे DATA में बदलें. पोस्टर की फ़ोटो चाहिए तो img:'लिंक' जोड़ें.
   क्लाउड (Google लॉगिन + स्टोरेज) का सेटअप: firebase-config.js */

// access: free | ads (विज्ञापन समर्थित) | vip | ppv
const DATA = [
  {id:1,type:'series',title:'मिर्ज़ापुर का साया',access:'vip',badge:'ट्रेंडिंग #1',meta:'सीज़न 1 • 8 एपिसोड',age:'U/A 16+',img:'',g:'linear-gradient(160deg,#0f4c5c,#e36414)'},
  {id:2,type:'movie',title:'रक्तबीज',access:'ppv',price:49,badge:'नया',meta:'2 घंटे 14 मिनट',age:'U/A 16+',img:'',g:'linear-gradient(160deg,#3a1c71,#d76d77)'},
  {id:3,type:'movie',title:'बनारस की गलियां',access:'ads',badge:'मुफ़्त',meta:'1 घंटा 48 मिनट',age:'U',img:'',g:'linear-gradient(160deg,#134e5e,#71b280)'},
  {id:4,type:'series',title:'कोटा जंक्शन',access:'vip',badge:'बिंज-योग्य',meta:'सीज़न 1 • 8 एपिसोड',age:'U/A 13+',img:'',g:'linear-gradient(160deg,#42275a,#734b6d)'}
];
const MICRO = [
  {id:101,type:'micro',title:'अरबपति का गुप्त विवाह',badge:'एपिसोड 1-3 मुफ़्त',meta:'10 सिक्के / एपिसोड',eps:42,age:'U/A 13+',freeEps:3,img:'',g:'linear-gradient(170deg,#c9a27e,#2b2b2b)'},
  {id:102,type:'micro',title:'माफिया क्वीन',badge:'एक्शन थ्रिलर',meta:'12 सिक्के / एपिसोड',eps:50,age:'U/A 16+',freeEps:3,img:'',g:'linear-gradient(170deg,#555,#0d0d0d)'}
];
const SAMPLE_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4'; // अपना वीडियो लिंक यहाँ डालें

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const store = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch(e){ return d } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch(e){} }
};

let favs = store.get('myott_favs', []);
let premium = store.get('myott_premium', false);
let ppv = store.get('myott_ppv', {});
let user = store.get('myott_user', null);
let filter = 'all', query = '';

const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
  || /; wv\)/.test(navigator.userAgent);
const cloud = { ready:false, auth:null, db:null };

/* ---------- स्टोरेज: फ़ोन + (लॉगिन होने पर) क्लाउड ---------- */
function persist(){
  store.set('myott_favs', favs);
  store.set('myott_premium', premium);
  store.set('myott_ppv', ppv);
  if(cloud.ready && user && user.uid){
    cloud.db.collection('users').doc(user.uid).set({
      name: user.name, email: user.email || null, photo: user.photo || null,
      favs, premium, ppv,
      updated: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true}).catch(() => toast('क्लाउड में सेव नहीं हो पाया'));
  }
}

function initCloud(){
  if(!window.FIREBASE_CONFIG || typeof firebase === 'undefined') return;
  try{
    firebase.initializeApp(window.FIREBASE_CONFIG);
    cloud.auth = firebase.auth();
    cloud.db = firebase.firestore();
    cloud.ready = true;
    cloud.auth.onAuthStateChanged(onAuth);
  }catch(e){ console.warn('Firebase चालू नहीं हुआ', e); }
}

async function onAuth(u){
  if(!u){
    if(user && !user.uid) return;          // नाम वाला डेमो लॉगिन रहने दें
    user = null; store.set('myott_user', null); render(); return;
  }
  user = {uid:u.uid, name:u.displayName || u.email || 'दोस्त', email:u.email, photo:u.photoURL};
  store.set('myott_user', user);
  try{
    const snap = await cloud.db.collection('users').doc(u.uid).get();
    const d = snap.exists ? snap.data() : {};
    favs = [...new Set([...(d.favs || []), ...favs])];
    premium = !!d.premium || premium;
    ppv = Object.assign({}, d.ppv || {}, ppv);
  }catch(e){ toast('क्लाउड से डेटा नहीं मिला'); console.warn(e); }
  persist();
  render();
}

async function signOut(){
  try{ if(cloud.ready) await cloud.auth.signOut(); }catch(e){}
  user = null; favs = []; premium = false; ppv = {};
  store.set('myott_user', null); persist();
  closeModal(); render(); toast('साइन आउट हो गए');
}

/* ---------- UI ---------- */
const bg = c => c.img ? `url('${c.img}') center/cover, ${c.g}` : c.g;
const accessLabel = c => ({
  free:'मुफ़्त', ads:'विज्ञापन समर्थित', vip:'VIP सब्सक्रिप्शन', ppv:`PPV • ₹${c.price}`
}[c.access] || c.meta);

function card(c){
  const micro = c.type === 'micro';
  const left = micro ? `${c.eps} एपिसोड` : c.meta;
  const sub = micro ? c.meta : accessLabel(c);
  return `<div class="card" data-id="${c.id}">
    <div class="poster ${micro?'v':''}" style="background:${bg(c)}">
      <span class="badge" ${micro?'style="background:var(--pink)"':''}>${c.badge}</span>
      <div class="big">${micro?'🎭':c.type==='movie'?'🎬':'📺'}</div>
      <div class="pmeta"><span>${left}</span><span>${c.age}</span></div>
    </div>
    <div class="ctitle">
      <div><b>${c.title}</b><small>${sub}</small></div>
      <button class="heart ${favs.includes(c.id)?'on':''}" data-fav="${c.id}" aria-label="पसंद">${favs.includes(c.id)?'♥':'♡'}</button>
    </div>
  </div>`;
}

function renderFeature(){
  const c = DATA[0];
  $('#fposter').style.background = bg(c);
  $('#fbadge').textContent = c.badge;
  $('#ftitle').textContent = c.title;
  $('#fmeta').textContent = c.meta + ' • ' + c.age;
}

function render(){
  const q = query.trim().toLowerCase();
  const match = c => c.title.toLowerCase().includes(q);
  const main = DATA.filter(c => (filter==='all'||filter===c.type) && match(c));
  const micro = MICRO.filter(c => (filter==='all'||filter==='micro') && match(c));
  $('#mainGrid').innerHTML = main.map(card).join('');
  $('#microGrid').innerHTML = micro.map(card).join('');
  $('#mainSec').hidden = !main.length && (filter==='micro');
  $('#microSec').hidden = !micro.length;
  $('#empty').hidden = !!(main.length || micro.length);
  $('#signBtn').textContent = user ? user.name.split(' ')[0] : 'साइन इन';
}

function toast(msg){
  const t = document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(), 2600);
}
function openModal(html){ $('#modal').innerHTML = `<button class="x" id="mx">×</button>${html}`; $('#overlay').hidden = false; $('#mx').onclick = closeModal; }
function closeModal(){ $('#overlay').hidden = true; $('#modal').innerHTML=''; }

function premiumModal(){
  openModal(`
    <p class="eyebrow gold">MYOTT PREMIUM</p>
    <h3>हर कहानी, बिना सीमा</h3>
    <p class="muted">इस preview में checkout MOCKED है— आप तुरंत access देख सकते हैं।</p>
    <div class="plan"><h4>मासिक वीआईपी</h4><div class="price">₹149<small>/माह</small></div>
      <p class="muted">सभी प्रीमियम कंटेंट और विज्ञापन मुक्त अनुभव</p>
      <button class="btn light" data-buy="monthly">MOCKED checkout</button></div>
    <div class="plan gold"><h4>वार्षिक प्रीमियम</h4><div class="price">₹799<small>/वर्ष</small></div>
      <p class="muted">12 महीने का अनलिमिटेड एक्सेस + 500 बोनस सिक्के</p>
      <button class="btn red" data-buy="yearly">MOCKED checkout</button></div>`);
}

function signInModal(){
  if(user){
    openModal(`<h3>नमस्ते, ${esc(user.name)}</h3>
      <p class="muted">${premium?'आप प्रीमियम सदस्य हैं ♛':'आप फ्री प्लान पर हैं।'}</p>
      <p class="muted">${user.uid?'आपका डेटा क्लाउड में सुरक्षित है।':'डेटा सिर्फ़ इसी फ़ोन में है।'}</p>
      <button class="btn light wide" id="out">साइन आउट</button>`);
    $('#out').onclick = signOut;
    return;
  }
  if(cloud.ready){
    openModal(`<h3>साइन इन करें</h3><p class="muted">अपने Google खाते से लॉगिन करें। पसंद और प्रीमियम हर फ़ोन पर साथ रहेंगे।</p>
      <button class="btn light wide" id="g"><span class="gmark">G</span>Google से लॉगिन</button>`);
    $('#g').onclick = async () => {
      try{
        if(isNative){
          // APK: असली (native) Google लॉगिन
          const plug = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication;
          if(!plug) throw {code:'native/plugin-missing'};
          const r = await plug.signInWithGoogle();
          const idToken = r && r.credential && r.credential.idToken;
          if(!idToken) throw {code:'native/no-token'};
          await cloud.auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(idToken));
        }else{
          await cloud.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        }
        closeModal(); toast('लॉगिन हो गया');
      }catch(e){
        console.warn(e);
        const c = e && (e.code || e.message) || '';
        toast(c === 'auth/unauthorized-domain' ? 'Firebase में यह डोमेन Authorized करें'
            : c === 'native/plugin-missing' ? 'इस APK में Google प्लगिन नहीं है'
            : /cancel|closed/i.test(c) ? 'लॉगिन रद्द हुआ' : 'लॉगिन नहीं हो पाया: ' + String(c).slice(0,60));
      }
    };
    return;
  }
  const note = 'क्लाउड सेटअप नहीं है, इसलिए डेटा सिर्फ़ इसी फ़ोन में रहेगा।';
  openModal(`<h3>साइन इन करें</h3><p class="muted">डेमो लॉगिन — कोई पासवर्ड नहीं चाहिए।</p>
    <p class="muted" style="font-size:14px;margin-top:6px">${note}</p>
    <input class="input" id="nm" placeholder="आपका नाम">
    <button class="btn red wide" id="go">जारी रखें</button>`);
  $('#go').onclick = () => {
    const name = $('#nm').value.trim();
    if(!name) return toast('नाम लिखें');
    user = {name}; store.set('myott_user', user); closeModal(); render(); toast('स्वागत है, '+name);
  };
}

function play(c, ep){
  openModal(`<h3>${c.title}</h3><p class="muted">${ep?('एपिसोड '+ep+' • '):''}डेमो वीडियो</p>
    <video src="${SAMPLE_VIDEO}" controls autoplay playsinline></video>`);
}

function open(id){
  const c = [...DATA, ...MICRO].find(x => x.id == id);
  if(!c) return;
  if(c.type==='micro'){
    const eps = Array.from({length:Math.min(c.eps,12)}, (_,i)=>i+1);
    openModal(`<h3>${c.title}</h3><p class="muted">${c.eps} एपिसोड • पहले ${c.freeEps} मुफ़्त</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px">
      ${eps.map(n=>`<button class="chip" data-ep="${n}" data-id="${c.id}">${n>c.freeEps&&!premium?'🔒 ':''}${n}</button>`).join('')}
      </div>`);
    return;
  }
  if(c.access==='vip' && !premium) return premiumModal();
  if(c.access==='ppv' && !ppv[c.id]){
    openModal(`<h3>${c.title}</h3><p class="muted">यह फिल्म ₹${c.price} में किराये पर उपलब्ध है (डेमो)।</p>
      <button class="btn red wide" id="rent">₹${c.price} में देखें (MOCKED)</button>`);
    $('#rent').onclick = () => { ppv[c.id] = true; persist(); play(c); };
    return;
  }
  play(c);
}

document.addEventListener('click', e => {
  const t = e.target;
  if(t.closest('[data-fav]')){
    const id = +t.closest('[data-fav]').dataset.fav;
    favs = favs.includes(id) ? favs.filter(x=>x!==id) : [...favs, id];
    persist(); render(); return;
  }
  const chip = t.closest('.chip[data-f]');
  if(chip){ filter = chip.dataset.f; document.querySelectorAll('.chip[data-f]').forEach(b=>b.classList.toggle('active',b===chip)); render(); return; }
  const ep = t.closest('[data-ep]');
  if(ep){
    const c = MICRO.find(x=>x.id==ep.dataset.id), n = +ep.dataset.ep;
    if(n>c.freeEps && !premium) return premiumModal();
    return play(c, n);
  }
  const buy = t.closest('[data-buy]');
  if(buy){ premium = true; persist(); closeModal(); toast('प्रीमियम चालू हो गया ♛'); render(); return; }
  const cardEl = t.closest('.card');
  if(cardEl) return open(cardEl.dataset.id);
  if(t.id==='overlay') closeModal();
});

$('#q').addEventListener('input', e => { query = e.target.value; render(); });
$('#signBtn').onclick = signInModal;
$('#seePremium').onclick = premiumModal;
$('#ctaBtn').onclick = premiumModal;
$('#watchNow').onclick = () => open(DATA[0].id);
renderFeature();
render();
initCloud();

// शुरुआती परदा: ख़त्म होने पर हटाएँ (टैप करके छोड़ भी सकते हैं)
const splash = $('#splash');
if(splash){ const end = () => splash.classList.add('done'); splash.onclick = end; setTimeout(end, 4500); }

// PWA: ऑफ़लाइन कैश + इंस्टॉल (सिर्फ़ https या localhost पर चलता है)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e;
  const b = document.createElement('button');
  b.className = 'btn red'; b.textContent = '⬇ ऐप इंस्टॉल करें';
  b.style.cssText = 'position:fixed;bottom:20px;right:16px;z-index:60;box-shadow:0 6px 24px rgba(0,0,0,.5)';
  b.onclick = async () => { deferredInstall.prompt(); await deferredInstall.userChoice; b.remove(); };
  document.body.appendChild(b);
});
