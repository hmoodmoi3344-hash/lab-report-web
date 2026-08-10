# -*- coding: utf-8 -*-
# build.py — 仓库根目录的统一构建脚本。
# 读取 src/data/*.json（原始实验数据），产出：
#   1) data/site-data.js         首页/动态页用的全局数据
#   2) exp/<id>.html            每个实验一个独立静态页（SEO 收录用）
#   3) sitemap.xml / robots.txt
# 本地运行：python build.py
# CI 运行：GitHub Actions 在 push 到 main 后自动跑，并把生成文件提交回 main。
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "src", "data")
OUT_EXP = os.path.join(BASE, "exp")
OUT_DATA = os.path.join(BASE, "data")

# 部署后的真实站点地址（GitHub Pages 默认子路径）。改这里即可换域名。
SITE_URL = os.environ.get("SITE_URL", "https://hmoodmoi3344-hash.github.io/lab-report-web")


def load(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return json.load(f)


# 每个实验对应哪门课（courseId 取自 courses.json）。
# 按实验内容归类：一门课会被多个专业的学生选修，按课程切比按专业切流量面更广。
EXP_COURSE = {
    # 流体 / 换热器 / 传热
    "exp_fluid_resistance": "fluid_mech",
    "exp_pump_curve": "fluid_mech",
    "exp_reynolds": "fluid_mech",
    "exp_heat_exchanger": "heat_transfer",
    "building_01": "fluid_mech",
    "aircraft_02": "fluid_mech",
    "navigation_04": "fluid_mech",
    "energy_03": "heat_transfer",
    "building_02": "heat_transfer",
    "building_04": "heat_transfer",
    "agriculture_04": "heat_transfer",
    "energy_02": "thermo",
    "energy_04": "thermo",
    "building_03": "thermo",
    "vehicle_01": "thermo",
    # 力学 / 材料
    "exp_metal_tensile": "eng_mechanics",
    "exp_rebar_tensile": "eng_mechanics",
    "exp_aircraft_tensile": "eng_mechanics",
    "mech_04": "eng_mechanics",
    "vehicle_02": "eng_mechanics",
    "vehicle_03": "eng_mechanics",
    "aircraft_03": "eng_mechanics",
    "agriculture_03": "eng_mechanics",
    "exp_concrete_compression": "struct_mech",
    "exp_soil_consolidation": "soil_mech",
    "geology_02": "soil_mech",
    "agriculture_01": "soil_mech",
    "exp_metalmat_tensile": "eng_material",
    "material_02": "eng_material",
    "material_03": "eng_material",
    "material_04": "eng_material",
    "metalmat_02": "eng_material",
    "metalmat_03": "eng_material",
    "metalmat_04": "eng_material",
    "nonmetal_01": "eng_material",
    "nonmetal_02": "eng_material",
    "nonmetal_03": "eng_material",
    "nonmetal_04": "eng_material",
    # 机械
    "mech_01": "mech_design",
    "mech_02": "mech_design",
    "mech_03": "mech_principle",
    "vehicle_04": "mech_design",
    "aircraft_04": "mfg_base",
    # 电路 / 电子 / 控制 / 信号
    "exp_wheatstone": "circuit",
    "electrical_01": "circuit",
    "electrical_03": "circuit",
    "electrical_04": "circuit",
    "elecinfo_04": "circuit",
    "electrical_02": "electromag",
    "elecinfo_02": "electronics",
    "elecinfo_03": "electronics",
    "comm_04": "electronics",
    "comm_01": "signal_system",
    "comm_02": "signal_system",
    "comm_03": "signal_system",
    "automation_01": "control",
    "automation_02": "control",
    "automation_03": "control",
    "automation_04": "control",
    # 化工原理
    "process_04": "chem_principle",
    "chemeng_01": "chem_principle",
    "chemeng_02": "chem_principle",
    "chemeng_03": "chem_principle",
    "chemeng_04": "chem_principle",
    # 测量 / 水力学 / 环境 / 安全 / 地质 / 采矿 / 食品 / 工程管理
    "civil_04": "surveying",
    "surveying_01": "surveying",
    "surveying_02": "surveying",
    "surveying_03": "surveying",
    "surveying_04": "surveying",
    "navigation_01": "surveying",
    "navigation_02": "surveying",
    "navigation_03": "surveying",
    "water_01": "hydraulics",
    "water_02": "hydraulics",
    "water_03": "hydraulics",
    "agriculture_02": "hydraulics",
    "water_04": "env_monitor",
    "environment_01": "env_monitor",
    "environment_02": "env_monitor",
    "environment_03": "env_monitor",
    "environment_04": "env_monitor",
    "safety_01": "safety",
    "safety_02": "safety",
    "safety_03": "safety",
    "safety_04": "safety",
    "geology_01": "geology_base",
    "geology_03": "geology_base",
    "geology_04": "geology_base",
    "mining_01": "mining_eng",
    "mining_02": "mining_eng",
    "mining_03": "mining_eng",
    "mining_04": "mining_eng",
    "food_01": "food_eng",
    "food_02": "food_eng",
    "food_03": "food_eng",
    "food_04": "food_eng",
    "engineeringmgmt_01": "eng_mgmt",
    "engineeringmgmt_02": "eng_mgmt",
    "engineeringmgmt_03": "eng_mgmt",
    "engineeringmgmt_04": "eng_mgmt",
}


def enrich(experiments):
    missing = []
    for e in experiments:
        cid = EXP_COURSE.get(e["id"])
        if not cid:
            missing.append(e["id"])
        e["courseId"] = cid or ""
    if missing:
        print("警告：以下实验未匹配到课程，courseId 留空:", missing)
    return experiments


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


def render_content(e, course_name, major_name):
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


def build_page(e, course_name, major_name):
    content = render_content(e, course_name, major_name)
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

    <nav class="legal-links">
      <a href="../about.html">关于本站</a> ·
      <a href="../contact.html">联系</a> ·
      <a href="../privacy.html">隐私政策</a> ·
      <a href="../disclaimer.html">免责声明</a>
    </nav>
  </div>
  <script>window.__EXP__ = {exp_json};</script>
  <script src="../js/calculators.js"></script>
  <script src="../js/exp-detail.js"></script>
</body>
</html>
""".format(title=esc(title), desc=esc(desc), content=content, calc_mount=calc_mount, exp_json=exp_json)


def main():
    majors = load("majors.json")
    courses = load("courses.json")
    experiments = enrich(load("experiments.json"))
    major_name = {m["id"]: m["name"] for m in majors}
    course_name = {c["id"]: c["name"] for c in courses}

    # 1) 全局数据文件
    os.makedirs(OUT_DATA, exist_ok=True)
    site_data = {"majors": majors, "courses": courses, "experiments": experiments}
    header = (
        "// 本文件由 build.py 自动生成，请勿手改。\n"
        "// 数据来源：src/data/*.json\n"
        "// 重要：全部实验数据均为 AI 虚构仿写演示样例，仅供报告格式参考，严禁直接提交作业。\n"
    )
    with open(os.path.join(OUT_DATA, "site-data.js"), "w", encoding="utf-8") as f:
        f.write(header)
        f.write("window.SITE_DATA = ")
        f.write(json.dumps(site_data, ensure_ascii=False, indent=1))
        f.write(";\n")

    # 2) 每个实验一个静态页
    os.makedirs(OUT_EXP, exist_ok=True)
    urls = []
    for e in experiments:
        html = build_page(e, course_name, major_name)
        with open(os.path.join(OUT_EXP, e["id"] + ".html"), "w", encoding="utf-8") as f:
            f.write(html)
        urls.append("exp/" + e["id"] + ".html")

    # 静态入口页 + 法定页面也进 sitemap，便于搜索引擎收录
    static_pages = ["index.html", "exp.html", "submit.html",
                    "about.html", "contact.html", "privacy.html", "disclaimer.html"]
    urls = static_pages + urls

    # 3) sitemap + robots
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        sm += "  <url><loc>" + SITE_URL + "/" + u + "</loc></url>\n"
    sm += "</urlset>\n"
    with open(os.path.join(BASE, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sm)
    robots = "User-agent: *\nAllow: /\nSitemap: " + SITE_URL + "/sitemap.xml\n"
    with open(os.path.join(BASE, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(robots)

    print("OK: 生成", len(urls), "个静态实验页 + data/site-data.js + sitemap.xml + robots.txt")


if __name__ == "__main__":
    main()
