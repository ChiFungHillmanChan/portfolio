(function(){"use strict";self.onmessage=async o=>{const{code:r,input:s}=o.data;try{self.fetch=void 0,self.XMLHttpRequest=void 0,self.WebSocket=void 0,self.importScripts=void 0;const e=new Function("input",`'use strict';
      // Execute provided code. It may either:
      // 1) Define function validate(input): boolean, or
      // 2) Immediately return a boolean (IIFE style)
      let __result;
      try {
        // Capture boolean-returning IIFE outputs
        __result = (function(){ ${r} })();
      } catch (_) {
        // Ignore runtime during pre-exec; a validate function may be defined instead
      }
      if (typeof validate === 'function') {
        try { return !!validate(input); } catch (_) { return false; }
      }
      if (typeof __result === 'boolean') {
        return __result;
      }
      return false;`),t=await Promise.race([Promise.resolve().then(()=>e(s)),new Promise((i,n)=>setTimeout(()=>n(new Error("Timeout")),500))]);typeof t=="boolean"?self.postMessage({ok:t}):self.postMessage({ok:!1,error:"Non-boolean result"})}catch(e){self.postMessage({ok:!1,error:String(e?.message||e)})}}})();
