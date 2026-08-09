// submit.js — 实验投稿页逻辑
// 功能：结构化填写实验 → 组装 JSON → 存本地草稿 + 复制 JSON + 邮件/Formspree 提交
// 注意：纯静态站无后端，投稿不会自动公开；管理员审核通过后再写入库并重生成页面。
(function () {
  "use strict";

  // ===== 配置（部署前按需修改）=====
  // 1) 接收投稿的邮箱（mailto 方式，零成本）
  const OWNER_EMAIL = "lab-report-owner@example.com";
  // 2) 可选：Formspree 端点（https://formspree.io 免费版，配置后自动收投稿）
  //    留空则仅使用 邮件 + 本地草稿 两种方式。
  const FORMSPREE_ENDPOINT = "";

  const LS_KEY = "lab_submissions";

  const data = window.SITE_DATA || {};
  const courses = data.courses || [];

  // ---- 填充课程下拉 ----
  const courseSel = document.getElementById("f-course");
  courses.forEach(c => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    courseSel.appendChild(o);
  });

  // ---- 可加行/删行的数据表编辑器 ----
  // 返回 { getTable(): {columns:[], rows:[[],...]} }
  function makeTableEditor(container, defaultHeaders) {
    const wrap = document.createElement("div");

    const headInput = document.createElement("input");
    headInput.type = "text";
    headInput.className = "col-head-input";
    headInput.placeholder = "列标题，用逗号分隔，如：序号,电压U(V),电流I(A)";
    headInput.value = defaultHeaders || "";
    wrap.appendChild(headInput);

    const table = document.createElement("table");
    table.className = "data edit";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    wrap.appendChild(table);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn ghost small";
    addBtn.textContent = "＋ 加一行";
    wrap.appendChild(addBtn);

    function headers() {
      return headInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    }

    function renderHead() {
      headRow.innerHTML = "";
      headers().forEach(h => {
        const th = document.createElement("th");
        th.textContent = h;
        headRow.appendChild(th);
      });
      const thDel = document.createElement("th");
      thDel.textContent = "操作";
      headRow.appendChild(thDel);
    }

    function addRow() {
      const tr = document.createElement("tr");
      const cols = headers();
      cols.forEach(() => {
        const td = document.createElement("td");
        const inp = document.createElement("input");
        inp.type = "text";
        td.appendChild(inp);
        tr.appendChild(td);
      });
      const tdOp = document.createElement("td");
      const del = document.createElement("button");
      del.type = "button";
      del.className = "row-del";
      del.textContent = "删除";
      del.onclick = () => tr.remove();
      tdOp.appendChild(del);
      tr.appendChild(tdOp);
      tbody.appendChild(tr);
    }

    headInput.addEventListener("input", () => {
      renderHead();
      // 同步已有行的列数
      Array.from(tbody.children).forEach(tr => {
        const cellCount = tr.children.length - 1; // 减去操作列
        const cols = headers().length;
        while (cellCount < cols) {
          const td = document.createElement("td");
          const inp = document.createElement("input");
          inp.type = "text";
          td.appendChild(inp);
          tr.insertBefore(td, tr.lastChild);
        }
        while (cellCount > cols && tr.children.length > 1) {
          tr.removeChild(tr.children[cellCount - 1]);
          cellCount--;
        }
      });
    });

    addBtn.onclick = addRow;

    container.appendChild(wrap);

    // 初始：表头 + 3 行
    renderHead();
    for (let i = 0; i < 3; i++) addRow();

    return {
      getTable: function () {
        const cols = headers();
        const rows = [];
        Array.from(tbody.children).forEach(tr => {
          const cells = tr.querySelectorAll("td input");
          const row = [];
          cells.forEach(inp => row.push(inp.value.trim()));
          rows.push(row);
        });
        return { columns: cols, rows: rows.filter(r => r.some(v => v !== "")) };
      }
    };
  }

  const rawEditor = makeTableEditor(document.getElementById("editor-raw"), "序号,测量值,单位");
  const calcEditor = makeTableEditor(document.getElementById("editor-calc"), "序号,计算量,结果");

  // ---- 读取表单 ----
  function linesToArr(v) {
    return v.split("\n").map(s => s.trim()).filter(Boolean);
  }

  function gather() {
    const courseId = courseSel.value;
    return {
      courseId: courseId,
      courseName: (courses.find(c => c.id === courseId) || {}).name || "",
      name: document.getElementById("f-name").value.trim(),
      purpose: linesToArr(document.getElementById("f-purpose").value),
      instruments: linesToArr(document.getElementById("f-instruments").value),
      raw: rawEditor.getTable(),
      calc: calcEditor.getTable(),
      analysis: document.getElementById("f-analysis").value.trim(),
      contact: document.getElementById("f-contact").value.trim(),
      note: document.getElementById("f-note").value.trim(),
      status: "待审核",
      submittedAt: new Date().toISOString()
    };
  }

  // ---- 本地草稿 ----
  function saveDraft(obj) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch (e) { list = []; }
    list.push(obj);
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  }

  function loadDrafts() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch (e) { return []; }
  }

  // ---- 复制 JSON ----
  function copyJson(obj) {
    const text = JSON.stringify(obj, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showResult(obj, "已复制到剪贴板"),
        () => showResult(obj, null, text)
      );
    } else {
      showResult(obj, null, text);
    }
  }

  function showResult(obj, clipMsg, rawText) {
    const box = document.getElementById("result");
    box.style.display = "block";
    const jsonText = rawText || JSON.stringify(obj, null, 2);
    let html = '<h2 class="result-title">✅ 投稿已记录（待审核）</h2>';
    if (clipMsg) html += '<p class="result-ok">' + clipMsg + '，可粘贴到微信/邮件发给管理员。</p>';
    html += '<p>投稿不会自动公开，管理员审核通过后会收录进样本库。你也可以通过以下方式提交：</p>';
    html += '<ul class="result-list">';
    html += '<li><a href="mailto:' + OWNER_EMAIL + '?subject=' +
      encodeURIComponent("实验投稿：" + obj.name) + '">📧 用邮件发送（打开邮件客户端）</a></li>';
    if (FORMSPREE_ENDPOINT) {
      html += '<li>已配置 Formspree，提交时会自动发送。</li>';
    } else {
      html += '<li>还想自动收稿？部署时接 Formspree（免费）即可，无需后端。</li>';
    }
    html += '</ul>';
    html += '<p class="result-hint">下面是投稿内容（JSON），可复制留存：</p>';
    html += '<textarea class="result-json" rows="10" readonly>' + escapeHtml(jsonText) + '</textarea>';
    box.innerHTML = html;
    box.scrollIntoView({ behavior: "smooth" });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  // ---- 提交 ----
  document.getElementById("submit-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    const obj = gather();
    if (!obj.courseId || !obj.name) {
      alert("请填写「所属课程」和「实验名称」。");
      return;
    }
    saveDraft(obj);

    // 若配置了 Formspree，自动 POST
    if (FORMSPREE_ENDPOINT) {
      fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(obj)
      }).catch(function () { /* 失败也不阻断本地保存 */ });
    }

    copyJson(obj);
  });

  // ---- 查看草稿 ----
  document.getElementById("btn-drafts").addEventListener("click", function () {
    const list = loadDrafts();
    const box = document.getElementById("drafts");
    box.style.display = "block";
    if (list.length === 0) {
      box.innerHTML = '<p class="empty">还没有草稿。填写上方表单并提交即可保存。</p>';
      return;
    }
    let html = '<h2 class="result-title">我的草稿（' + list.length + ' 条，仅存于此浏览器）</h2>';
    list.slice().reverse().forEach((d, i) => {
      html += '<div class="draft-item"><strong>' + escapeHtml(d.name) +
        '</strong> · ' + escapeHtml(d.courseName) + ' · ' + escapeHtml(d.status) +
        ' · ' + (d.submittedAt || "").slice(0, 19).replace("T", " ") + '</div>';
    });
    box.innerHTML = html;
    box.scrollIntoView({ behavior: "smooth" });
  });
})();
