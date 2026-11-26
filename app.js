/* MyOTT — शून्य-निर्भरता डेमो ऐप. डेटा नीचे DATA में बदलें. */

// access: free | ads (विज्ञापन समर्थित) | vip | ppv
const DATA = [
  {id:1,type:'series',title:'मिर्ज़ापुर का साया',access:'vip',badge:'ट्रेंडिंग #1',meta:'सीज़न 1 • 8 एपिसोड',age:'U/A 16+',g:'linear-gradient(160deg,#0f4c5c,#e36414)'},
  {id:2,type:'movie',title:'रक्तबीज',access:'ppv',price:49,badge:'नया',meta:'2 घंटे 14 मिनट',age:'U/A 16+',g:'linear-gradient(160deg,#3a1c71,#d76d77)'},
  {id:3,type:'movie',title:'बनारस की गलियां',access:'ads',badge:'मुफ़्त',meta:'1 घंटा 48 मिनट',age:'U',g:'linear-gradient(160deg,#134e5e,#71b280)'},
  {id:4,type:'series',title:'कोटा जंक्शन',access:'vip',badge:'बिंज-योग्य',meta:'सीज़न 1 • 8 एपिसोड',age:'U/A 13+',g:'linear-gradient(160deg,#42275a,#734b6d)'}
];
const MICRO = [
  {id:101,type:'micro',title:'अरबपति का गुप्त विवाह',badge:'एपिसोड 1-3 मुफ़्त',meta:'10 सिक्के / एपिसोड',eps:42,age:'U/A 13+',freeEps:3,g:'linear-gradient(170deg,#c9a27e,#2b2b2b)'},
  {id:102,type:'micro',title:'माफिया क्वीन',badge:'एक्शन थ्रिलर',meta:'12 सिक्के / एपिसोड',eps:50,age:'U/A 16+',freeEps:3,g:'linear-gradient(170deg,#555,#0d0d0d)'}
];
const SAMPLE_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4'; // अपना वीडियो लिंक यहाँ डालें

const $ = s => document.querySelector(s);
const store = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch(e){ return d } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch(e){} }
};
let favs = store.get('myott_favs', []);
let premium = store.get('myott_premium', false);
let user = store.get('myott_user', null);
let filter = 'all', query = '';

const accessLabel = c => ({
  free:'मुफ़्त', ads:'विज्ञापन समर्थित', vip:'VIP सब्सक्रिप्शन', ppv:`PPV • ₹${c.price}`
}[c.access] || c.meta);

function card(c){
  const micro = c.type === 'micro';
  const left = micro ? `${c.eps} एपिसोड` : c.meta;
  const sub = micro ? c.meta : accessLabel(c);
  return `<div class="card" data-id="${c.id}">
    <div class="poster ${micro?'v':''}" style="background:${c.g}">
      <span class="badge ${micro&&c.id===102?'':micro?'pink':''}" ${micro?'style="background:var(--pink)"':''}>${c.badge}</span>
      <div class="big">${micro?'🎭':c.type==='movie'?'🎬':'📺'}</div>
      <div class="pmeta"><span>${left}</span><span>${c.age}</span></div>
    </div>
    <div class="ctitle">
      <div><b>${c.title}</b><small>${sub}</small></div>
      <button class="heart ${favs.includes(c.id)?'on':''}" data-fav="${c.id}" aria-label="पसंद">${favs.includes(c.id)?'♥':'♡'}</button>
    </div>
  </div>`;
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
  document.body.appendChild(t); setTimeout(()=>t.remove(), 2200);
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
    openModal(`<h3>नमस्ते, ${user.name}</h3><p class="muted">${premium?'आप प्रीमियम सदस्य हैं ♛':'आप फ्री प्लान पर हैं।'}</p>
      <button class="btn light wide" id="out">साइन आउट</button>`);
    $('#out').onclick = () => { user=null; store.set('myott_user',null); closeModal(); render(); toast('साइन आउट हो गए'); };
    return;
  }
  openModal(`<h3>साइन इन करें</h3><p class="muted">डेमो लॉगिन — कोई पासवर्ड नहीं चाहिए।</p>
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
  if(c.access==='ppv' && !store.get('ppv_'+c.id,false)){
    openModal(`<h3>${c.title}</h3><p class="muted">यह फिल्म ₹${c.price} में किराये पर उपलब्ध है (डेमो)।</p>
      <button class="btn red wide" id="rent">₹${c.price} में देखें (MOCKED)</button>`);
    $('#rent').onclick = () => { store.set('ppv_'+c.id,true); play(c); };
    return;
  }
  play(c);
}

document.addEventListener('click', e => {
  const t = e.target;
  if(t.closest('[data-fav]')){
    const id = +t.closest('[data-fav]').dataset.fav;
    favs = favs.includes(id) ? favs.filter(x=>x!==id) : [...favs, id];
    store.set('myott_favs', favs); render(); return;
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
  if(buy){ premium = true; store.set('myott_premium', true); closeModal(); toast('प्रीमियम चालू हो गया ♛'); render(); return; }
  const cardEl = t.closest('.card');
  if(cardEl) return open(cardEl.dataset.id);
  if(t.id==='overlay') closeModal();
});

$('#q').addEventListener('input', e => { query = e.target.value; render(); });
$('#signBtn').onclick = signInModal;
$('#seePremium').onclick = premiumModal;
$('#ctaBtn').onclick = premiumModal;
$('#watchNow').onclick = () => $('#mainSec').scrollIntoView();
render();

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
