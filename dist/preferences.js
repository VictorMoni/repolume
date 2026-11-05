// Apply the saved theme before CSS loads; storage may be unavailable in private contexts.
(()=>{let theme='system';try{const saved=localStorage.getItem('repolume-theme');if(['system','light','dark'].includes(saved))theme=saved;}catch{}document.documentElement.dataset.theme=theme;})();
