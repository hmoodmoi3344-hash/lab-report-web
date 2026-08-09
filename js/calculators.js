// calculators.js
// 8 个带真实物理公式的实验 → 交互式「数据处理计算器」。
// 每个计算器结构：
//   title : 标题
//   hint  : 给学生看的输入说明
//   inputs: 学生要填的字段 [{ key, label, unit }]
//   outputs: 计算输出列 [{ label, unit }]（顺序即返回数组顺序）
//   computeRows(rows): rows 为数组，每项是 { 字段key: 数值 }；
//                      返回二维数组，每行输出值顺序同 outputs。
// 注意：公式移植自小程序 scripts/generate_data.py，仅用于演示计算流程。
(function () {
  "use strict";

  // ---- 通用工具 ----
  function round(x, n) {
    const p = Math.pow(10, n);
    return Math.round(x * p) / p;
  }

  // ---- 常量（与 generate_data.py 一致）----
  const A_fluid = Math.PI * 0.021 * 0.021 / 4;
  const d_fluid = 0.021, nu_w = 1.007e-6;

  const A0 = Math.PI * 10.0 * 10.0 / 4; // 拉伸试样截面积 mm² (d0=10mm)
  const E = 2.0e5;                       // 钢弹性模量 MPa

  const d_re = 0.014, A_re = Math.PI * d_re * d_re / 4, nu_re = 1.007e-6;

  const H0 = 20.0, e0 = 0.82;           // 固结试验

  // ---- 拉伸类（金属/钢筋/复合材料，共用同一公式）----
  const tensile = {
    title: "拉伸试验 · 数据处理",
    hint: "输入各组载荷 F（kN），自动计算应力 σ 与应变 ε。",
    inputs: [{ key: "F", label: "载荷 F", unit: "kN" }],
    outputs: [{ label: "应力 σ", unit: "MPa" }, { label: "应变 ε", unit: "" }],
    computeRows(rows) {
      return rows.map(r => {
        const F = Number(r.F);
        const sigma = F * 1000 / A0;
        const eps = sigma / E;
        return [round(sigma, 1), round(eps, 6)];
      });
    }
  };

  const calculators = {
    // 1. 流体阻力测定
    exp_fluid_resistance: {
      title: "流体阻力测定 · 数据处理",
      hint: "输入你实测的各组流量 Q，自动算出平均流速 u、雷诺数 Re 与摩擦系数 λ。",
      inputs: [{ key: "Q", label: "流量 Q", unit: "m³/h" }],
      outputs: [
        { label: "平均流速 u", unit: "m/s" },
        { label: "雷诺数 Re", unit: "" },
        { label: "摩擦系数 λ", unit: "" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const Q = Number(r.Q);
          const u = Q / (3600 * A_fluid);
          const Re = u * d_fluid / nu_w;
          const lam = Re < 2300 ? 64 / Re : 0.3164 * Math.pow(Re, -0.25);
          return [round(u, 4), round(Re, 0), round(lam, 4)];
        });
      }
    },

    // 2. 离心泵特性曲线
    exp_pump_curve: {
      title: "离心泵特性曲线 · 数据处理",
      hint: "输入各组流量 Q、扬程 H、轴功率 N，自动算出泵效率 η。",
      inputs: [
        { key: "Q", label: "流量 Q", unit: "m³/h" },
        { key: "H", label: "扬程 H", unit: "m" },
        { key: "N", label: "轴功率 N", unit: "kW" }
      ],
      outputs: [
        { label: "扬程 H", unit: "m" },
        { label: "轴功率 N", unit: "kW" },
        { label: "效率 η", unit: "%" }
      ],
      computeRows(rows) {
        const rho = 1000.0, g = 9.81;
        return rows.map(r => {
          const Q = Number(r.Q), H = Number(r.H), N = Number(r.N);
          const eff = N > 0 ? (rho * g * (Q / 3600) * H) / (N * 1000) * 100 : 0;
          return [round(H, 2), round(N, 3), round(eff, 1)];
        });
      }
    },

    // 3. 套管换热器传热系数
    exp_heat_exchanger: {
      title: "套管换热器传热系数 · 数据处理",
      hint: "输入冷热流体进/出口温度与流量，自动算换热量、对数平均温差与总传热系数 K。",
      inputs: [
        { key: "th1", label: "热流体进口 T_h1", unit: "℃" },
        { key: "th2", label: "热流体出口 T_h2", unit: "℃" },
        { key: "tc1", label: "冷流体进口 T_c1", unit: "℃" },
        { key: "tc2", label: "冷流体出口 T_c2", unit: "℃" },
        { key: "mh", label: "热侧流量 m_h", unit: "kg/s" },
        { key: "mc", label: "冷侧流量 m_c", unit: "kg/s" }
      ],
      outputs: [
        { label: "热侧换热量 Q_h", unit: "kW" },
        { label: "冷侧换热量 Q_c", unit: "kW" },
        { label: "对数平均温差 ΔTm", unit: "℃" },
        { label: "总传热系数 K", unit: "W/m²·K" }
      ],
      computeRows(rows) {
        const cp = 4180.0, A = 0.4;
        return rows.map(r => {
          const th1 = Number(r.th1), th2 = Number(r.th2);
          const tc1 = Number(r.tc1), tc2 = Number(r.tc2);
          const mh = Number(r.mh), mc = Number(r.mc);
          const Qh = cp * mh * (th1 - th2);
          const Qc = cp * mc * (tc2 - tc1);
          const Qavg = (Qh + Qc) / 2;
          const dt1 = th1 - tc2, dt2 = th2 - tc1;
          const dtm = (dt1 - dt2) / Math.log(dt1 / dt2);
          const K = Qavg / (A * dtm);
          return [round(Qh / 1000, 3), round(Qc / 1000, 3), round(dtm, 2), round(K, 1)];
        });
      }
    },

    // 4. 拉伸类（4 个实验共用）
    exp_metal_tensile: tensile,
    exp_rebar_tensile: tensile,
    exp_metalmat_tensile: tensile,
    exp_aircraft_tensile: tensile,

    // 5. 雷诺实验
    exp_reynolds: {
      title: "雷诺实验 · 数据处理",
      hint: "输入各组流量 Q，自动算出平均流速 u、雷诺数 Re 与临界流速 u_c。",
      inputs: [{ key: "Q", label: "流量 Q", unit: "L/min" }],
      outputs: [
        { label: "平均流速 u", unit: "m/s" },
        { label: "雷诺数 Re", unit: "" },
        { label: "临界流速 u_c", unit: "m/s" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const Q = Number(r.Q);
          const q = Q / 60 / 1000;
          const u = q / A_re;
          const Re = u * d_re / nu_re;
          const uc = 2300 * nu_re / d_re;
          return [round(u, 4), round(Re, 0), round(uc, 4)];
        });
      }
    },

    // 6. 惠斯通电桥
    exp_wheatstone: {
      title: "惠斯通电桥 · 数据处理",
      hint: "输入比例臂 R1、R2 与测定臂 R3，自动算出待测电阻 R_x。",
      inputs: [
        { key: "R1", label: "比例臂 R1", unit: "Ω" },
        { key: "R2", label: "比例臂 R2", unit: "Ω" },
        { key: "R3", label: "测定臂 R3", unit: "Ω" }
      ],
      outputs: [{ label: "测得 R_x", unit: "Ω" }],
      computeRows(rows) {
        return rows.map(r => {
          const R1 = Number(r.R1), R2 = Number(r.R2), R3 = Number(r.R3);
          return [round(R2 / R1 * R3, 2)];
        });
      }
    },

    // 7. 土的固结试验（需按行累计，顺序计算）
    exp_soil_consolidation: {
      title: "土的固结试验 · 数据处理",
      hint: "按加压顺序输入各级压力 p 与累积沉降 s，自动算孔隙比 e 与压缩模量 Es。",
      inputs: [
        { key: "p", label: "压力 p", unit: "kPa" },
        { key: "s", label: "累积沉降 s", unit: "mm" }
      ],
      outputs: [
        { label: "孔隙比 e", unit: "" },
        { label: "压缩模量 Es", unit: "MPa" }
      ],
      computeRows(rows) {
        let cum = 0, prev_e = e0, prev_p = null;
        return rows.map(r => {
          const p = Number(r.p), s = Number(r.s);
          cum += s;
          const e = e0 - (1 + e0) * cum / H0;
          const dp = prev_p === null ? p : p - prev_p;
          const de = prev_e - e;
          const Es = de > 0 ? (1 + e0) / (de / dp) / 1000.0 : 0;
          prev_e = e; prev_p = p;
          return [round(e, 4), round(Es, 2)];
        });
      }
    },

    // 8. 混凝土抗压强度
    exp_concrete_compression: {
      title: "混凝土抗压强度 · 数据处理",
      hint: "输入试块边长 a 与破坏荷载 P，自动算抗压强度 f_c。",
      inputs: [
        { key: "a", label: "边长 a", unit: "mm" },
        { key: "P", label: "破坏荷载 P", unit: "kN" }
      ],
      outputs: [{ label: "抗压强度 f_c", unit: "MPa" }],
      computeRows(rows) {
        return rows.map(r => {
          const a = Number(r.a), P = Number(r.P);
          const area = a * a;
          const fc = P * 1000 / area;
          return [round(fc, 2)];
        });
      }
    }
  };

  calculators.__defaultRows = 6;

  // ---- 通用统计计算器（覆盖无专属公式的实验）----
  // 读取实验 raw 表的测量列，让学生填自己的实测读数，
  // 自动算每个量的 平均值 / 标准差 / 相对标准偏差 / 极差。
  // 注意：只做通用统计处理，不编任何实验专属物理公式；结果仅供方法参考。
  const NON_MEASURE = /序号|编号|名称|型号|类型|说明|备注|index|no\.?|#/i;

  function makeGeneric(exp) {
    const raw = exp && exp.raw;
    if (!raw || !Array.isArray(raw.columns)) return null;
    const inputs = [];
    raw.columns.forEach(function (label, i) {
      if (NON_MEASURE.test(label)) return; // 跳过 序号/编号 等非测量列
      let unit = "";
      const m = label.match(/\(([^)]*)\)\s*$/);
      let name = label;
      if (m) { unit = m[1]; name = label.replace(/\s*\([^)]*\)\s*$/, ""); }
      inputs.push({ key: "c" + i, label: name, unit: unit });
    });
    if (inputs.length === 0) return null; // 没有可测列则不挂计算器
    return {
      generic: true,
      summary: true,
      title: "数据处理 · 通用统计计算",
      hint: "输入你自己的实测数据（每行一组观测，可点「加一行」增删），自动计算各物理量的平均值、标准差、相对标准偏差与极差。本工具仅做通用统计处理，不涉及本实验专属公式，结果仅供方法参考。",
      inputs: inputs,
      statColumns: ["平均值", "标准差 s", "相对标准偏差 %", "极差"]
    };
  }
  calculators.makeGeneric = makeGeneric;

  window.CALCULATORS = calculators;
})();
