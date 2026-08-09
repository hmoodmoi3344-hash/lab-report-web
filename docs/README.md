# 工科实验报告样本库 · 网站版

把小程序里的实验报告样例，做成**可被百度/Google 收录的独立内容站**，核心增量是
「数据处理计算器」：学生填自己的实测数据 → 实时算出处理结果。

## 目录结构
```
web/
  index.html            首页（课程目录：按课程分组 + 搜索 + 课程快速跳转）
  exp.html              实验详情页（动态，?id=xxx）
  submit.html           实验投稿页（同学补充自己的实验数据，UGC）
  css/style.css         响应式样式 + 广告位占位 + 投稿表单样式
  js/
    app.js              首页逻辑
    exp-detail.js       详情页渲染 + 计算器挂载（动态/静态两种模式）
    calculators.js      8 类实验的真实计算公式
    submit.js           投稿表单逻辑（组装 JSON + 本地草稿 + 邮件/Formspree 提交）
  data/site-data.js     从小程序转换来的全局数据（window.SITE_DATA）
  exp/<id>.html         每个实验的静态 SEO 页（build_pages.py 生成）
  converter.py          把小程序 JSON 转成 site-data.js
  build_pages.py        生成静态 SEO 页 + sitemap.xml + robots.txt
  sitemap.xml / robots.txt
  docs/README.md
```

## 本地运行
```bash
cd web
python -m http.server 8000
# 浏览器打开 http://localhost:8000/index.html
```

## 如何重新生成
1. **数据有更新**（小程序改了 experiments.json 等）：
   ```bash
   python converter.py      # 刷新 data/site-data.js
   python build_pages.py    # 重新生成 exp/*.html + sitemap
   ```
2. **只改了样式/脚本**：直接改 css/style.css、js/* 即可，无需重跑脚本。

## 如何扩充
- **加实验**：编辑小程序 `data/experiments.js`（或 JSON），重跑上面两条命令。
- **加计算器**：在 `js/calculators.js` 按现有 8 个的格式，补一个实验的
  `inputs / outputs / computeRows`（移植真实公式）。目前只有 8 类有公开公式，
  其余实验详情页会显示「计算器持续补充中」。
- **实验归类到课程**：在 `converter.py` 的 `EXP_COURSE` 字典里给实验 id 指定
  `courseId`（取自 `courses.json`）。首页按课程筛选、详情页展示课程标签都依赖它。
- **同学投稿（UGC）**：`submit.html` 是结构化投稿表单，学生填课程/实验名/目的/仪器/
  两张数据表/误差分析后提交。当前为纯静态站，投稿会存浏览器本地草稿并可通过
  邮件或 Formspree 发给你；**审核通过后再手动写入 `experiments.json` 并重跑生成命令才会公开**。
  接入后端（如 Formspree / CloudBase）可实现全自动收录。投稿入口在首页顶部「＋ 补充实验数据」。

## 变现
- 主线：广告（页面已留广告位占位，部署后接百度联盟 / AdSense）。
- 辅线：延续小程序里的「闲鱼卖 Excel 自动计算模板」思路（详情页已有引导文案）。

## 重要声明（务必保留）
全部实验数据均为 **AI 虚构仿写演示样例**，仅供报告**格式与结构参考**，
严禁直接复制提交作为课程实验作业。网站每页均已明示该声明。
若要做成严肃产品，需替换为真实/可核验数据，或明确自身定位为「格式范例」。
