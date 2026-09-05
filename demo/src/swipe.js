'use strict';
(() => {
  // Pointer events preserve vertical scrolling and do not claim multi-finger gestures.
  class SwipeNavigator {
    constructor(element,enabled,onSwipe) {
      let start=null,multiple=false,suppressUntil=0;
      const pointers=new Set();
      element.addEventListener('pointerdown',e=>{
        pointers.add(e.pointerId);
        if(pointers.size>1) { multiple=true;start=null;return; }
        if(!enabled()||!e.isPrimary||e.button!==0||e.target.closest('input,select,textarea,a,[contenteditable=true]')) return;
        start={x:e.clientX,y:e.clientY,time:performance.now(),id:e.pointerId};
      });
      window.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);start=null;if(!pointers.size)multiple=false;});
      window.addEventListener('pointerup',e=>{
        const origin=start,blocked=multiple;
        pointers.delete(e.pointerId);start=null;if(!pointers.size)multiple=false;
        if(!origin||blocked||origin.id!==e.pointerId||!enabled())return;
        const x=e.clientX-origin.x,y=e.clientY-origin.y;
        if(Math.abs(x)<70||Math.abs(x)<Math.abs(y)*1.7||performance.now()-origin.time>1200)return;
        // A drag ending on a button must not also activate that button's click.
        suppressUntil=performance.now()+400;
        onSwipe(x<0?'next':'back');
      });
      document.addEventListener('click',e=>{
        if(performance.now()<suppressUntil) {e.preventDefault();e.stopImmediatePropagation();}
      },true);
    }
  }
  TT.SwipeNavigator=SwipeNavigator;
})();
