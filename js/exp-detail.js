// exp-detail.js — 实验详情页逻辑
// 两种模式：
//   动态模式（exp.html?id=xxx）：从 SITE_DATA 查实验，渲染全部内容并挂载计算器。
//   静态模式（build_pages.py 生成的 exp/<id>.html）：window.__EXP__ 已预渲染内容，
//                   本脚本只挂载计算器，避免覆盖已写好的静态 HTML（利于 SEO）。
(function () {
  "use strict";
  const data = window.SITE_DATA || null;
  const calcs = window.CALCULATORS || {};
  const majorName = {};
  const courseName = {};
  if (data) {
    (data.majors || []).forEach(m => { majorName[m.id] = m.name; });
    (data.courses || []).forEach(c => { courseName[c.id] = c.name; });
  }

  const contentEl = document.getElementById("content");
  const calcMount = document.getElementById("calc-mount");

  // ---- 取实验对象 ----
  let exp = window.__EXP__ || null;
  if (!exp && data) {
    const id = new URLSearchParams(location.search).get("id");
    exp = (data.experiments || []).find(e => e.id === id) || null;
  }

  if (!exp) {
    if (contentEl) contentEl.innerHTML = '<div class="empty">未找到该实验。</div>';
    return;
  }

  if (!window.__EXP__) {
    document.title = exp.name + " · 实验报告样本";
    renderContent(exp, contentEl, majorName, courseName);
  }

  let calc = calcs[exp.id] || null;
  if (!calc && calcMount) {
    calc = calcs.makeGeneric ? calcs.makeGeneric(exp) : null;
  }
  if (calc) {
    buildCalculator(calc, calcMount);
  } else if (calcMount) {
    calcMount.innerHTML =
      '<div class="calc-note">本实验暂未配置在线计算器，当前仅展示范例数据处理表' +
      '（见上方「四、数据处理计算表」）。</div>';
  }

  // ---------- 内容渲染（动态模式）----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function renderTable(table) {
    if (!table || !table.columns) return "";
    let html = '<div class="table-scroll"><table class="data"><thead><tr>';
    table.columns.forEach(c => { html += "<th>" + escapeHtml(c) + "</th>"; });
    html += "</tr></thead><tbody>";
    (table.rows || []).forEach(r => {
      html += "<tr>";
      r.forEach(cell => { html += "<td>" + escapeHtml(cell) + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }

  function bullets(arr) {
    return (arr || []).map(x => '<div class="bullet">· ' + escapeHtml(x) + "</div>").join("");
  }

  function renderContent(e, root, mName, cName) {
    let html = "";
    html += '<a class="back" href="index.html">← 返回样本库</a>';
    html += '<div class="rep-head"><div class="rep-title">' + escapeHtml(e.name) + "</div>";
    html += '<div class="meta"><span class="tag">' + escapeHtml(cName[e.courseId] || "未分类") + "</span>";
    if (mName[e.majorId]) {
      html += '<span class="tag muted">' + escapeHtml(mName[e.majorId]) + "</span>";
    }
    html += "</div></div>";
    html += '<div class="disclaimer"><strong>声明：</strong>本实验全部数据为 AI 虚构仿写演示样例，仅供报告格式与结构参考，严禁直接提交作为课程作业。</div>';
    html += '<section class="section"><div class="section-title">一、实验目的</div>' + bullets(e.purpose) + "</section>";
    html += '<section class="section"><div class="section-title">二、实验仪器设备</div>' + bullets(e.instruments) + "</section>";
    html += '<section class="section"><div class="section-title">三、原始测量数据表</div>' + renderTable(e.raw) + "</section>";
    html += '<section class="section"><div class="section-title">四、数据处理计算表</div>' + renderTable(e.calc) + "</section>";
    html += '<section class="section"><div class="section-title">五、数据分析与误差讨论</div><div class="para">' + escapeHtml(e.analysis) + "</div></section>";
    root.innerHTML = html;
  }

  // ---------- 计算器构建（两种模式共用）----------
  function th(t) { const e = document.createElement("th"); e.textContent = t; return e; }
  function tdOut() { const e = document.createElement("td"); e.className = "out-cell"; e.textContent = ""; return e; }

  function buildCalculator(calc, mount) {
    if (calc.summary) { buildSummaryCalculator(calc, mount); return; }
    const wrap = document.createElement("div");
    wrap.className = "calc";
    const h = document.createElement("h2"); h.textContent = calc.title; wrap.appendChild(h);
    const hint = document.createElement("p"); hint.className = "hint"; hint.textContent = calc.hint; wrap.appendChild(hint);

    const tbl = document.createElement("table"); tbl.className = "calc-table";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    hr.appendChild(th("序号"));
    calc.inputs.forEach(inp => hr.appendChild(th(inp.label + (inp.unit ? " (" + inp.unit + ")" : ""))));
    calc.outputs.forEach(out => hr.appendChild(th(out.label + (out.unit ? " (" + out.unit + ")" : ""))));
    thead.appendChild(hr); tbl.appendChild(thead);

    const tbody = document.createElement("tbody"); tbl.appendChild(tbody);
    wrap.appendChild(tbl);

    const btnRow = document.createElement("div");
    const calcBtn = document.createElement("button"); calcBtn.className = "btn"; calcBtn.textContent = "计算";
    const addBtn = document.createElement("button"); addBtn.className = "btn ghost"; addBtn.textContent = "加一行";
    btnRow.appendChild(calcBtn); btnRow.appendChild(addBtn);
    wrap.appendChild(btnRow);

    const note = document.createElement("div"); note.className = "calc-note";
    note.textContent = "填入你自己的实测数据后点「计算」。结果按公开公式自动算得，仅供方法参考。";
    wrap.appendChild(note);

    mount.innerHTML = ""; mount.appendChild(wrap);

    const defaultRows = (window.CALCULATORS && window.CALCULATORS.__defaultRows) || 6;

    function addRow() {
      const tr = document.createElement("tr");
      const idx = tbody.children.length + 1;
      const idxTd = document.createElement("td"); idxTd.textContent = String(idx); tr.appendChild(idxTd);
      calc.inputs.forEach(inp => {
        const tdEl = document.createElement("td");
        const inpEl = document.createElement("input");
        inpEl.type = "number"; inpEl.step = "any"; inpEl.dataset.key = inp.key;
        tdEl.appendChild(inpEl); tr.appendChild(tdEl);
      });
      calc.outputs.forEach(() => tr.appendChild(tdOut()));
      tbody.appendChild(tr);
    }
    function fillRows(n) { tbody.innerHTML = ""; for (let i = 0; i < n; i++) addRow(); }
    fillRows(defaultRows);

    addBtn.onclick = () => addRow();

    calcBtn.onclick = () => {
      const trs = Array.from(tbody.children);
      const complete = [];
      trs.forEach(tr => {
        const ok = calc.inputs.every(inp => {
          const el = tr.querySelector('input[data-key="' + inp.key + '"]');
          return el && el.value.trim() !== "" && !isNaN(Number(el.value));
        });
        if (ok) {
          const obj = {};
          calc.inputs.forEach(inp => {
            const el = tr.querySelector('input[data-key="' + inp.key + '"]');
            obj[inp.key] = el.value;
          });
          complete.push(obj);
        }
      });
      if (complete.length === 0) { alert("请至少完整填写一行数据再计算。"); return; }
      const results = calc.computeRows(complete);
      let ri = 0;
      trs.forEach(tr => {
        const ok = calc.inputs.every(inp => {
          const el = tr.querySelector('input[data-key="' + inp.key + '"]');
          return el && el.value.trim() !== "" && !isNaN(Number(el.value));
        });
        const outCells = tr.querySelectorAll(".out-cell");
        if (ok && ri < results.length) {
          const res = results[ri];
          outCells.forEach((c, i) => { c.textContent = res[i] === undefined ? "" : String(res[i]); });
          ri++;
        } else {
          outCells.forEach(c => { c.textContent = ""; });
        }
      });
    };
  }

  // ---------- 通用统计计算器（汇总模式：按列算统计量）----------
  function buildSummaryCalculator(calc, mount) {
    const wrap = document.createElement("div");
    wrap.className = "calc";
    const h = document.createElement("h2"); h.textContent = calc.title; wrap.appendChild(h);
    const hint = document.createElement("p"); hint.className = "hint"; hint.textContent = calc.hint; wrap.appendChild(hint);

    const tbl = document.createElement("table"); tbl.className = "calc-table";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    hr.appendChild(th("观测组"));
    calc.inputs.forEach(inp => hr.appendChild(th(inp.label + (inp.unit ? " (" + inp.unit + ")" : ""))));
    thead.appendChild(hr); tbl.appendChild(thead);

    const tbody = document.createElement("tbody"); tbl.appendChild(tbody);
    wrap.appendChild(tbl);

    const btnRow = document.createElement("div");
    const calcBtn = document.createElement("button"); calcBtn.className = "btn"; calcBtn.textContent = "计算统计";
    const addBtn = document.createElement("button"); addBtn.className = "btn ghost"; addBtn.textContent = "加一行";
    btnRow.appendChild(calcBtn); btnRow.appendChild(addBtn);
    wrap.appendChild(btnRow);

    const note = document.createElement("div"); note.className = "calc-note";
    note.textContent = "填入你自己的实测数据后点「计算统计」。仅做通用统计处理，不涉及本实验专属公式。";
    wrap.appendChild(note);

    const resultBox = document.createElement("div"); resultBox.className = "calc-result"; wrap.appendChild(resultBox);

    mount.innerHTML = ""; mount.appendChild(wrap);

    function addRow() {
      const tr = document.createElement("tr");
      const idx = tbody.children.length + 1;
      const idxTd = document.createElement("td"); idxTd.textContent = String(idx); tr.appendChild(idxTd);
      calc.inputs.forEach(inp => {
        const tdEl = document.createElement("td");
        const inpEl = document.createElement("input");
        inpEl.type = "number"; inpEl.step = "any"; inpEl.dataset.key = inp.key;
        tdEl.appendChild(inpEl); tr.appendChild(tdEl);
      });
      tbody.appendChild(tr);
    }
    function fillRows(n) { tbody.innerHTML = ""; for (let i = 0; i < n; i++) addRow(); }
    fillRows(5);
    addBtn.onclick = () => addRow();

    calcBtn.onclick = () => {
      const data = {}; // key -> number[]
      calc.inputs.forEach(inp => { data[inp.key] = []; });
      Array.from(tbody.children).forEach(tr => {
        calc.inputs.forEach(inp => {
          const el = tr.querySelector('input[data-key="' + inp.key + '"]');
          if (el && el.value.trim() !== "" && !isNaN(Number(el.value))) {
            data[inp.key].push(Number(el.value));
          }
        });
      });
      const empty = calc.inputs.every(inp => data[inp.key].length === 0);
      if (empty) { alert("请至少在一个物理量下填入一组数值再计算。"); return; }

      let html = '<div class="calc-result-title">统计结果</div>';
      html += '<div class="table-scroll"><table class="data"><thead><tr><th>物理量</th>';
      calc.statColumns.forEach(c => { html += "<th>" + c + "</th>"; });
      html += "</tr></thead><tbody>";
      calc.inputs.forEach(inp => {
        const arr = data[inp.key];
        const s = stats(arr);
        html += "<tr><td>" + escapeHtml(inp.label) + (inp.unit ? " (" + escapeHtml(inp.unit) + ")" : "") + "</td>";
        if (s) {
          html += "<td>" + s.mean + "</td><td>" + s.sd + "</td><td>" + s.rsd + "</td><td>" + s.range + "</td>";
        } else {
          html += "<td colspan=\"4\" class=\"muted\">无数据</td>";
        }
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      resultBox.innerHTML = html;
    };
  }

  function stats(arr) {
    const n = arr.length;
    if (n === 0) return null;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const variance = n > 1 ? arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1) : 0;
    const sd = Math.sqrt(variance);
    const rsd = mean !== 0 ? (sd / Math.abs(mean) * 100) : 0;
    const max = Math.max.apply(null, arr), min = Math.min.apply(null, arr);
    return {
      mean: round(mean, 4),
      sd: round(sd, 4),
      rsd: round(rsd, 2),
      range: round(max - min, 4)
    };
  }

  function round(x, n) {
    const p = Math.pow(10, n);
    return Math.round(x * p) / p;
  }
})();
