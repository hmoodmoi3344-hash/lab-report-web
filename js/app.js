// app.js — 首页：课程目录（按课程分组展示）+ 搜索 + 课程快速跳转
(function () {
  "use strict";
  const data = window.SITE_DATA;
  if (!data) { return; }

  const courses = data.courses || [];
  const experiments = data.experiments || [];

  // 实验按课程分组（courseId -> [实验]）
  const byCourse = {};
  experiments.forEach(e => {
    const cid = e.courseId || "uncategorized";
    (byCourse[cid] = byCourse[cid] || []).push(e);
  });

  // 仅展示有实验归属的课程，保持 courses.json 原有顺序
  const activeCourses = courses.filter(c => (byCourse[c.id] || []).length > 0);

  let query = "";

  const navEl = document.getElementById("course-nav");
  const catalogEl = document.getElementById("catalog");
  const searchEl = document.getElementById("search");
  const hintEl = document.getElementById("search-hint");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  // 卡片跳转到预渲染的静态 SEO 页（exp/<id>.html），无需 JS 也能打开
  function cardHtml(e) {
    return '<a class="exp-card" href="exp/' + encodeURIComponent(e.id) + '.html">' +
      '<h3>' + escapeHtml(e.name) + '</h3>' +
      '<div class="meta">含原始测量数据与处理计算表</div>' +
      '</a>';
  }

  // 顶部课程快速跳转导航
  function buildNav() {
    navEl.innerHTML = "";
    activeCourses.forEach(c => {
      const a = document.createElement("a");
      a.className = "nav-chip";
      a.href = "#course-" + c.id;
      a.textContent = c.name;
      navEl.appendChild(a);
    });
  }

  // 课程目录：每个课程一个分组，分组内是该课程的实验卡片网格
  function render() {
    const q = query.trim().toLowerCase();
    catalogEl.innerHTML = "";
    let total = 0;

    activeCourses.forEach(c => {
      const list = (byCourse[c.id] || []).filter(e =>
        !q || (e.name || "").toLowerCase().indexOf(q) !== -1
      );
      if (list.length === 0) { return; }
      total += list.length;

      const section = document.createElement("section");
      section.className = "course-block";
      section.id = "course-" + c.id;
      section.innerHTML =
        '<h2 class="course-title">' + escapeHtml(c.name) +
        ' <span class="count">' + list.length + ' 个实验</span></h2>' +
        '<div class="grid">' + list.map(cardHtml).join("") + '</div>';
      catalogEl.appendChild(section);
    });

    if (total === 0) {
      catalogEl.innerHTML = '<div class="empty">没有匹配的实验，换个关键词试试。</div>';
    }
    if (hintEl) { hintEl.style.display = q ? "block" : "none"; }
  }

  searchEl.addEventListener("input", ev => { query = ev.target.value; render(); });
  buildNav();
  render();
})();
