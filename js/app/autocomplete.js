(function(ns){
  if(ns.App && ns.App._autocompleteAttached) return;
  ns.App = ns.App || {};
  ns.App._autocompleteAttached = true;

  function escapeForRegex(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

  // fallback levenshtein (used only if ns.App.levenshtein missing)
  function localLevenshtein(a,b){
    if(a===b) return 0;
    a = String(a||''); b = String(b||'');
    const al=a.length, bl=b.length;
    if(al===0) return bl;
    if(bl===0) return al;
    const dp = Array(al+1).fill(null).map(()=>Array(bl+1).fill(0));
    for(let i=0;i<=al;i++) dp[i][0]=i;
    for(let j=0;j<=bl;j++) dp[0][j]=j;
    for(let i=1;i<=al;i++){
      for(let j=1;j<=bl;j++){
        const cost = a[i-1]===b[j-1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
      }
    }
    return dp[al][bl];
  }

  const levens = (ns.App && typeof ns.App.levenshtein === 'function') ? ns.App.levenshtein : localLevenshtein;

  const input = document.getElementById('commandInput');
  const dropdown = document.getElementById('autocompleteDropdown');

  if(!input || !dropdown) return;

  input.addEventListener('input', ()=>{
    const raw = input.value.trim();
    if(!raw){ dropdown.style.display='none'; return; }
    const templates = (ns.App && typeof ns.App.generateCommandTemplates === 'function') ? ns.App.generateCommandTemplates() : [];
    const q = raw.toLowerCase();
    let matches = templates.filter(t => t.toLowerCase().startsWith(q));
    if(matches.length===0){
      const scored = templates.map(t=>({t,score: levens(q, t.toLowerCase())})).filter(x=>x.score<=3).sort((a,b)=>a.score-b.score).slice(0,10).map(x=>x.t);
      matches = scored;
    } else matches = matches.slice(0,10);

    if(matches.length===0){ dropdown.style.display='none'; return; }
    dropdown.innerHTML='';
    const re = new RegExp(escapeForRegex(raw),'i');
    matches.forEach(s=>{
      const d = document.createElement('div');
      d.innerHTML = s.replace(re,m=>`<mark>${m}</mark>`);
      d.addEventListener('click', ()=>{ input.value = s; dropdown.style.display='none'; input.focus(); });
      dropdown.appendChild(d);
    });
    dropdown.style.display='block';
  });

  document.addEventListener('click', e => { if(!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.style.display='none'; });
})(window.Game);
