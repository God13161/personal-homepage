/* ============================================================
   实验一：个人网页制作 —— script.js
   交互功能清单：
   1. 深色/浅色主题切换（记忆偏好 localStorage + prefers-color-scheme）
   2. 移动端汉堡菜单（aria-expanded / Escape 关闭 / 点击链接收起）
   3. 导航滚动高亮（IntersectionObserver + aria-current）
   4. 项目轮播（左右按钮 + 圆点指示 + 自动播放 + 键盘方向键）
   5. 联系表单校验（aria-invalid + 错误提示 + Toast 反馈）
   6. 返回顶部按钮
   7. 滚动浮现动画（尊重 prefers-reduced-motion）
   ============================================================ */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- 1. 主题切换 ---------- */
  var themeBtn = $('#theme-toggle');
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
    }
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* 隐私模式下忽略 */ }
    });
  }

  /* ---------- 2. 移动端汉堡菜单 ---------- */
  var navToggle = $('#nav-toggle');
  var siteNav = $('#site-nav');
  function closeNav() {
    if (!siteNav || !navToggle) return;
    siteNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      siteNav.classList.toggle('open', !expanded);
    });
    // 点击导航链接后自动收起菜单
    siteNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });
    // Escape 键收起菜单并把焦点还给按钮
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && siteNav.classList.contains('open')) {
        closeNav();
        navToggle.focus();
      }
    });
    // 窗口放大回桌面布局时，清除移动端折叠状态
    window.addEventListener('resize', function () {
      if (window.innerWidth > 767) closeNav();
    });
  }

  /* ---------- 3. 导航滚动高亮（scrollspy） ---------- */
  var navLinks = $$('#site-nav a[href^="#"]');
  var linkMap = {};
  navLinks.forEach(function (a) { linkMap[a.getAttribute('href').slice(1)] = a; });
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.remove('is-active');
          a.removeAttribute('aria-current');
        });
        var link = linkMap[entry.target.id];
        if (link) {
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' }); // 分区滚过视口中线即判定为“当前”
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 4. 项目轮播 ---------- */
  var carousel = $('#projects .carousel');
  if (carousel) {
    var track = $('#carousel-track', carousel);
    var slides = $$('.slide', track);
    var prevBtn = $('#carousel-prev', carousel);
    var nextBtn = $('#carousel-next', carousel);
    var dotsBox = $('#carousel-dots', carousel);
    var current = 0;
    var timer = null;
    var AUTOPLAY_MS = 5000;

    var dots = slides.map(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', '转到第 ' + (i + 1) + ' 个项目');
      dot.addEventListener('click', function () { goTo(i); restart(); });
      dotsBox.appendChild(dot);
      return dot;
    });

    function goTo(i) {
      current = (i + slides.length) % slides.length; // 循环轮播
      track.style.transform = 'translateX(-' + current * 100 + '%)';
      dots.forEach(function (d, di) {
        d.classList.toggle('is-active', di === current);
        if (di === current) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }

    function restart() {
      if (reducedMotion) return; // 减少动效：不自动播放
      clearInterval(timer);
      timer = setInterval(function () { goTo(current + 1); }, AUTOPLAY_MS);
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); restart(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); restart(); });

    // 鼠标悬停 / 键盘聚焦时暂停自动播放，离开后恢复
    carousel.addEventListener('mouseenter', function () { clearInterval(timer); });
    carousel.addEventListener('mouseleave', restart);
    carousel.addEventListener('focusin', function () { clearInterval(timer); });
    carousel.addEventListener('focusout', restart);

    // 键盘方向键切换
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { goTo(current - 1); restart(); }
      if (e.key === 'ArrowRight') { goTo(current + 1); restart(); }
    });

    // 触摸滑动切换（移动端）：横向滑动超过 48px 判定翻页，左滑下一张、右滑上一张
    var touchX = null;
    track.addEventListener('touchstart', function (e) {
      touchX = e.touches[0].clientX;
      clearInterval(timer); // 手指触摸期间暂停自动播放
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 48) goTo(dx < 0 ? current + 1 : current - 1);
      restart();
    }, { passive: true });
    track.addEventListener('touchcancel', function () {
      touchX = null;
      restart();
    }, { passive: true });

    goTo(0);
    restart();
  }

  /* ---------- 5. 联系表单校验 + Toast ---------- */
  var toast = $('#toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 3000);
  }

  var form = $('#contact-form');
  if (form) {
    var rules = [
      { field: $('#f-name'), test: function (v) { return v.trim().length > 0; }, msg: '请填写您的称呼' },
      { field: $('#f-email'), test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }, msg: '请填写有效的邮箱地址（需包含 @）' },
      { field: $('#f-message'), test: function (v) { return v.trim().length >= 5; }, msg: '留言内容至少 5 个字' }
    ];

    function setError(rule, hasError) {
      var errEl = $('#' + rule.field.id + '-error');
      rule.field.setAttribute('aria-invalid', hasError ? 'true' : 'false');
      if (errEl) errEl.textContent = hasError ? rule.msg : '';
    }

    // 输入时即时清除该字段错误
    rules.forEach(function (rule) {
      rule.field.addEventListener('input', function () { setError(rule, false); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault(); // 演示页面：拦截真实提交
      var firstBad = null;
      rules.forEach(function (rule) {
        var bad = !rule.test(rule.field.value);
        setError(rule, bad);
        if (bad && !firstBad) firstBad = rule.field;
      });
      if (firstBad) {
        firstBad.focus();
        showToast('请按提示完善表单后再提交');
        return;
      }
      showToast('提交成功！本页面为演示作品，内容不会被真实发送。');
      form.reset();
    });
  }

  /* ---------- 6. 返回顶部 ---------- */
  var backTop = $('#back-top');
  if (backTop) {
    var toggleBackTop = function () {
      backTop.classList.toggle('show', window.scrollY > 600);
    };
    window.addEventListener('scroll', toggleBackTop, { passive: true });
    toggleBackTop();
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 7. 滚动浮现动画 ---------- */
  var revealEls = $$('.reveal');
  if (revealEls.length) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('in-view'); });
    } else {
      var revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      revealEls.forEach(function (el) { revealIO.observe(el); });
    }
  }
})();
