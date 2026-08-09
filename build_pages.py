# -*- coding: utf-8 -*-
# build_pages.py — 为每个实验预生成独立静态 HTML（利于百度/Google 收录 SEO），
# 同时内联数据 + 复用 calculators.js / exp-detail.js 提供交互计算器。
# 运行：python build_pages.py
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "..", "lab-report-miniprogram", "data")
OUT_EXP = os.path.join(BASE, "exp")

sys.path.insert(0, BASE)
from converter import enrich  # 复用同一套 实验→课程 匹配，避免重复维护


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#39;"))


def render_table(table):
    if not table or not table.get("columns"):
        return ""
    cols = table["columns"]
    rows = table.get("rows", [])
    html = '<div class="table-scroll"><table class="data"><thead><tr>'
    for c in cols:
        html += "<th>" + esc(c) + "</th>"
    html += "</tr></thead><tbody>"
    for r in rows:
        html += "<tr>"
        for cell in r:
            html += "<td>" + esc(cell) + "</td>"
        html += "</tr>"
    html += "</tbody></table></div>"
    return html


def bullets(arr):
    return "".join('<div class="bullet">· ' + esc(x) + "</div>" for x in (arr or []))


def render_content(e, major_name, course_name):
    html = ""
    html += '<a class="back" href="../index.html">← 返回样本库</a>'
    html += '<div class="rep-head"><div class="rep-title">' + esc(e["name"]) + "</div>"
    html += '<div class="meta"><span class="tag">' + esc(course_name.get(e["courseId"], "未分类")) + "</span>"
    if e["majorId"] in major_name:
        html += '<span class="tag muted">' + esc(major_name[e["majorId"]]) + "</span>"
    html += "</div></div>"
    html += ('<div class="disclaimer"><strong>声明：</strong>本实验全部数据为 AI 虚构仿写演示样例，'
             '仅供报告格式与结构参考，严禁直接提交作为课程作业。</div>')
    html += '<section class="section"><div class="section-title">一、实验目的</div>' + bullets(e.get("purpose")) + "</section>"
    html += '<section class="section"><div class="section-title">二、实验仪器设备</div>' + bullets(e.get("instruments")) + "</section>"
    html += '<section class="section"><div class="section-title">三、原始测量数据表</div>' + render_table(e.get("raw")) + "</section>"
    html += '<section class="section"><div class="section-title">四、数据处理计算表</div>' + render_table(e.get("calc")) + "</section>"
    html += '<section class="section"><div class="section-title">五、数据分析与误差讨论</div><div class="para">' + esc(e.get("analysis", "")) + "</div></section>"
    return html


def build_page(e, major_name, course_name):
    content = render_content(e, major_name, course_name)
    exp_json = json.dumps(e, ensure_ascii=False)
    title = e["name"] + " · 实验报告样本（原始数据 + 数据处理）"
    desc = "实验目的、仪器设备、原始测量数据与数据处理计算表。" + (e.get("purpose", [""])[0] if e.get("purpose") else "")
    calc_mount = '<div id="calc-mount"></div>'
    return """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <link rel="stylesheet" href="../css/style.css" />
</head>
<body>
  <div class="wrap">
    <div id="content">{content}</div>
    {calc_mount}
    <div class="ad-slot"></div>
    <div class="monetize"><strong>想要更省事？</strong> 本站提供 Excel 自动计算模板（输入原始数据即出结果），可在闲鱼搜索「工科实验报告计算模板」获取；也欢迎收藏本站，在线计算器持续补充中。</div>
    <footer class="site-footer">数据均为 AI 虚构仿写演示样例，仅供格式参考，严禁直接提交作业。</footer>
  </div>
  <script>window.__EXP__ = {exp_json};</script>
  <script src="../js/calculators.js"></script>
  <script src="../js/exp-detail.js"></script>
</body>
</html>
""".format(title=esc(title), desc=esc(desc), content=content, calc_mount=calc_mount, exp_json=exp_json)


def main():
    with open(os.path.join(SRC, "experiments.json"), encoding="utf-8") as f:
        experiments = json.load(f)
    enrich(experiments)  # 给每条实验补 courseId
    with open(os.path.join(SRC, "majors.json"), encoding="utf-8") as f:
        majors = json.load(f)
    with open(os.path.join(SRC, "courses.json"), encoding="utf-8") as f:
        courses = json.load(f)
    major_name = {m["id"]: m["name"] for m in majors}
    course_name = {c["id"]: c["name"] for c in courses}

    os.makedirs(OUT_EXP, exist_ok=True)
    urls = []
    for e in experiments:
        eid = e["id"]
        html = build_page(e, major_name, course_name)
        with open(os.path.join(OUT_EXP, eid + ".html"), "w", encoding="utf-8") as f:
            f.write(html)
        urls.append("exp/" + eid + ".html")

    # sitemap
    host = "https://your-domain.example.com"  # 部署后替换为真实域名
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        sm += "  <url><loc>" + host + "/" + u + "</loc></url>\n"
    sm += "</urlset>\n"
    with open(os.path.join(BASE, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sm)

    # robots
    robots = "User-agent: *\nAllow: /\nSitemap: " + host + "/sitemap.xml\n"
    with open(os.path.join(BASE, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(robots)

    print("OK: 生成", len(urls), "个静态实验页 + sitemap.xml + robots.txt")


if __name__ == "__main__":
    main()
