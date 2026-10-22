/* Se ejecuta en <head> para evitar el parpadeo al cargar */
(function(){
  var t=null;
  try{t=localStorage.getItem('sonorix-theme');}catch(e){}
  if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
  document.documentElement.setAttribute('data-theme',t);
})();
