'use strict';
(() => {
  const events = window.EVENTS;
  const images = window.ARCHIVE_IMAGES;
  const key = 'last-light-archive-v1';
  const ids = events.map(e => e.id);
  const byId = Object.fromEntries(events.map(e => [e.id, e]));
  const el = id => document.getElementById(id);
  const text = (id,value) => {el(id).textContent = value;};
  let storageWorks = true;
  let state;
  function shuffled(avoid) {
    const order = [...ids];
    for (let i=order.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [order[i],order[j]]=[order[j],order[i]];
    }
    if(order[0]===avoid && order.length>1) [order[0],order[1]]=[order[1],order[0]];
    return order;
  }
  function migrate(s) {
    if (!s || !Array.isArray(s.order) || !s.order.length
      || new Set(s.order).size !== s.order.length || !s.order.every(id => ids.includes(id))
      || !Number.isInteger(s.seen) || s.seen < 1 || s.seen > s.order.length
      || !Number.isInteger(s.view) || s.view < 0 || s.view >= s.seen) return null;
    if (s.order.length < ids.length) {
      const seen = s.order.slice(0, s.seen);
      const unseen = shuffled().filter(id => !seen.includes(id));
      return {...s, order: [...seen, ...unseen]};
    }
    return s;
  }
  function readStorage() {
    try { return migrate(JSON.parse(localStorage.getItem(key))); }
    catch { return null; }
  }
  function persist() {
    try {localStorage.setItem(key,JSON.stringify(state));}
    catch {storageWorks=false;}
  }
  function start(avoid) {state={order:shuffled(avoid),seen:1,view:0};persist();}
  state=readStorage();
  if(!state)start();
  else persist();
  function addLink(parent,url,label) {
    const a=document.createElement('a');a.href=url;a.textContent=label;
    a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
  }
  let imageSequence=0;
  function render() {
    const e=byId[state.order[state.view]];
    const art=images[e.id];
    for(const id of ['year','location','category','scope','deck','what','outcome','nuance'])text(id,e[id]);
    text('event-title',e.title);
    text('image-kind',art.kind || (art.license.includes('artwork')?'HISTORICAL ARTWORK':'ARCHIVE IMAGE'));
    const img=el('event-image'), sequence=++imageSequence;
    img.alt=art.caption;
    img.referrerPolicy='no-referrer';
    img.decoding='async';
    const residue=el('residue');
    if(img.naturalWidth){residue.src=img.currentSrc || img.src;residue.classList.add('lingering');}
    img.style.opacity='0';
    img.hidden=false;
    el('image-error').hidden=true;
    const backdrop = el('backdrop');
    backdrop.classList.remove('ready');
    function imageReady() {
      if(sequence !== imageSequence) return;
      img.style.opacity='1';
      residue.classList.remove('lingering');
      backdrop.onload=()=>{if(sequence===imageSequence)backdrop.classList.add('ready');};
      backdrop.src=img.currentSrc || img.src;
      if(backdrop.complete && backdrop.naturalWidth)backdrop.classList.add('ready');
    }
    img.onload=imageReady;
    let triedFallback=false;
    img.onerror=()=>{if(sequence===imageSequence){if(art.fallback_url && !triedFallback){triedFallback=true;img.src=art.fallback_url;return;}img.hidden=true;residue.classList.remove('lingering');el('image-error').hidden=false;}};
    img.src=art.image_url;
    if(img.complete && img.naturalWidth)imageReady();
    const caption=el('caption');caption.replaceChildren();
    const description=document.createElement('span');description.textContent=art.caption;caption.append(description);
    const credit=document.createElement('span');credit.className='credit';credit.textContent=art.credit+' · ';
    addLink(credit,art.license_url,art.license);
    caption.append(credit);
    const treatment=document.createElement('span');treatment.className='credit';treatment.textContent='Image colour reduced for display; background enlarged and softened. The original is linked below.';caption.append(treatment);
    el('image-link').href=art.source_page;
    const sources=el('source-links');sources.replaceChildren();
    addLink(sources,e.source,'Historical source');
    if(e.source2)addLink(sources,e.source2,'Further reading');
    text('deal-label','draw a card');
    el('previous').disabled=state.view===0;
    const card=el('trading-card');card.classList.remove('dealt');
    void card.offsetWidth;card.classList.add('dealt');
    const content=el('story-content');content.classList.remove('entering');
    void content.offsetWidth;content.classList.add('entering');
    text('announcement',e.year+'. '+e.title+'. '+e.scope+'.');
    return {id:e.id,year:e.year,title:e.title,scope:e.scope,seen:state.seen,total:ids.length};
  }
  function generate() {
    const saved=readStorage();if(saved && saved.seen>state.seen)state=saved;
    if(state.seen===ids.length)start(state.order[state.view]);
    else {state.view=state.seen;state.seen++;persist();}
    document.querySelector('.context').open=false;
    return render();
  }
  // Short, dry paper friction: no samples, network request, or musical pitch.
  let shuffleContext, shuffleBuffer, activeShuffle;
  async function playShuffle() {
    try {
      const AudioEngine=window.AudioContext || window.webkitAudioContext;
      if(!AudioEngine)return;
      if(!shuffleContext || shuffleContext.state==='closed') {
        shuffleContext=new AudioEngine();shuffleBuffer=null;
      }
      const context=shuffleContext;
      if(context.state==='suspended')await context.resume();
      if(context.state!=='running')return;
      if(!shuffleBuffer) {
        const length=Math.ceil(context.sampleRate*.48);
        shuffleBuffer=context.createBuffer(1,length,context.sampleRate);
        const data=shuffleBuffer.getChannelData(0);
        const strokes=[.018,.063,.115,.178,.248,.331];
        let smoothed=0;
        for(let i=0;i<length;i++) {
          const time=i/context.sampleRate;
          let envelope=0;
          for(let j=0;j<strokes.length;j++) {
            const phase=(time-strokes[j])/(.042+j*.007);
            if(phase>0 && phase<1)envelope+=Math.sin(Math.PI*phase)**1.8*(1-j*.085);
          }
          const noise=Math.random()*2-1;
          smoothed=.6*smoothed+.4*noise;
          data[i]=(noise*.35+smoothed*.65)*envelope;
        }
      }
      if(activeShuffle){try{activeShuffle.stop();}catch{}}
      const source=context.createBufferSource();
      const low=context.createBiquadFilter(), high=context.createBiquadFilter();
      const gain=context.createGain();
      source.buffer=shuffleBuffer;
      source.playbackRate.value=.94+Math.random()*.12;
      high.type='highpass';high.frequency.value=600;
      low.type='lowpass';low.frequency.value=4600;
      gain.gain.value=.22;
      source.connect(high);high.connect(low);low.connect(gain);gain.connect(context.destination);
      activeShuffle=source;
      source.onended=()=>{source.disconnect();high.disconnect();low.disconnect();gain.disconnect();if(activeShuffle===source)activeShuffle=null;};
      source.start();
    } catch { /* A blocked sound must never prevent drawing a card. */ }
  }
  el('generate-top').addEventListener('click',()=>{void playShuffle();generate();});
  el('previous').addEventListener('click',()=>{if(state.view>0){state.view--;persist();render();}});
  window.addEventListener('storage',event=>{if(event.key===key){const saved=readStorage();if(saved){state=saved;render();}}});
  render();
  const soundtrack=el('soundtrack'), musicButton=el('music-toggle');
  soundtrack.volume=.35;
  function updateMusic() {
    const playing=!soundtrack.paused;
    musicButton.setAttribute('aria-pressed',String(playing));
    musicButton.setAttribute('aria-label',playing?'Pause background music':'Play background music');
    text('music-label',playing?'music on':'music off');
    text('music-symbol',playing?'Ⅱ':'▷');
  }
  musicButton.addEventListener('click',async()=>{
    if(!soundtrack.paused) { soundtrack.pause(); return; }
    musicButton.disabled=true;
    try { await soundtrack.play(); text('audio-status','Music playing. Luciernaga, Untitled II.'); }
    catch { text('audio-status','Music could not start. Please try again.'); }
    finally { musicButton.disabled=false; updateMusic(); }
  });
  soundtrack.addEventListener('play',updateMusic);
  soundtrack.addEventListener('pause',updateMusic);
  soundtrack.addEventListener('error',()=>{text('music-label','Retry music');text('audio-status','The soundtrack could not load. Press Retry music to try again.');});
  el('music-volume').addEventListener('input',event=>{soundtrack.volume=Number(event.target.value)/100;});
  if(document.modelContext?.registerTool) {
    const lifecycle=new AbortController();
    try {
      Promise.resolve(document.modelContext.registerTool({
        name:'generate_historical_moment',title:'Deal a historical card',
        description:'Deal the next unseen historical card. After the entire deck is revealed, start a new shuffle.',
        inputSchema:{type:'object',properties:{},additionalProperties:false},
        annotations:{readOnlyHint:false,untrustedContentHint:false},
        execute(input){
          if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).length)throw new Error('Expected an empty object.');
          return generate();
        }
      },{signal:lifecycle.signal})).catch(()=>{});
    } catch {}
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
})();
