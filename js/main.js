// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Mobile menu
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close mobile menu on link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

function updateActiveNav() {
  const scrollY = window.scrollY + 80;
  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    const link = document.querySelector(`.nav-links a[href="#${id}"]`);
    if (link) {
      link.style.color = (scrollY >= top && scrollY < top + height)
        ? 'var(--accent)'
        : '';
    }
  });
}
window.addEventListener('scroll', updateActiveNav, { passive: true });

// Scroll reveal animation
const reveals = document.querySelectorAll(
  '.activity-card, .step, .stat-card, .skills-category, .strength-card, .hobby-item, .cv-block, .projet-card'
);

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('reveal');
      setTimeout(() => entry.target.classList.add('visible'), i * 60);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

reveals.forEach(el => {
  el.classList.add('reveal');
  observer.observe(el);
});

// Activity card expand/collapse
function toggleDetail(btn) {
  const card = btn.closest('.activity-card');
  const detail = card.querySelector('.activity-detail');
  const isOpen = detail.classList.contains('open');

  // Close all others
  document.querySelectorAll('.activity-detail.open').forEach(d => {
    d.classList.remove('open');
    d.closest('.activity-card').querySelector('.expand-btn').textContent = 'Voir détails ▾';
  });

  if (!isOpen) {
    detail.classList.add('open');
    btn.textContent = 'Fermer ▴';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
