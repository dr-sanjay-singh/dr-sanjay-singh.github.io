{
  const b = document.querySelector('.burger'), n = document.querySelector('.nav');
  if (b && n) b.addEventListener('click', () => {
    const open = n.classList.toggle('open');
    b.classList.toggle('x', open);
    b.setAttribute('aria-expanded', open);
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.rv,.label').forEach(el => io.observe(el));
  const hero = document.querySelector('.hero'), fol = document.querySelector('.follow');
  if (hero && fol) new IntersectionObserver(es => fol.classList.toggle('hide', es[0].intersectionRatio > .35), { threshold: [0, .35, .6, 1] }).observe(hero);
  const y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
}
