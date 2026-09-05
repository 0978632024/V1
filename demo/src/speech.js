'use strict';
(() => {
  class Speech {
    constructor(notify) { this.notify=notify; this.enabled=false; this.rate=.95; this.token=0; this.unlocked=false; }
    unlock() {
      if(!('speechSynthesis' in window) || this.unlocked) return;
      // Must run directly inside the enabling button's trusted gesture.
      const silent=new SpeechSynthesisUtterance(' '); silent.volume=0;
      speechSynthesis.speak(silent); this.unlocked=true;
    }
    stop() { ++this.token; clearTimeout(this.timer); if('speechSynthesis' in window) speechSynthesis.cancel(); }
    speak(text, sensitive=false) {
      this.stop();
      if(!this.enabled || sensitive) return;
      if(!('speechSynthesis' in window)) { this.notify('此瀏覽器無法播放 Demo 語音，請使用螢幕閱讀器或文字引導。'); return; }
      const token=this.token;
      // Keep the iOS cancel → setTimeout → speak workaround; invalidate stale jobs.
      this.timer=setTimeout(()=>{
        if(token!==this.token || !this.enabled) return;
        const voices=speechSynthesis.getVoices();
        const voice=voices.find(v=>/^zh[-_]TW/i.test(v.lang))||voices.find(v=>/^zh/i.test(v.lang));
        (text.match(/[^。！？]+[。！？]?/g)||[]).filter(s=>s.trim()).forEach(part=>{
          const u=new SpeechSynthesisUtterance(part); u.lang='zh-TW'; u.rate=this.rate;
          if(voice) u.voice=voice;
          u.onerror=e=>{ if(!['canceled','interrupted'].includes(e.error)) this.notify('語音暫時無法播放，文字與按鈕仍可操作。'); };
          speechSynthesis.speak(u);
        });
      },150);
    }
  }
  TT.Speech=Speech;
})();
