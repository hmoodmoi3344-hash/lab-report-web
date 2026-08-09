// calculators.js
// 带真实物理/工程公式的实验 → 交互式「数据处理计算器」。
// 覆盖拉伸、流体、换热器、布氏硬度、XRD、晶粒度、电路/电子、化工、COD、凯氏定氮、
// 黏度、钢筋混凝土、梁正应力、锅炉/汽轮机、空调、车辆、地质、采矿等约 55 个实验。
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
    },

    // ===== 新增：更多课程的真实公式计算器（均为公开标准公式，仅供方法演示）=====
    // 工程材料
    material_03: {
      title: "布氏硬度测定 · 数据处理",
      hint: "输入试验力 F（kgf，如 3000）、压头球直径 D 与压痕直径 d（mm），自动算布氏硬度 HB。",
      inputs: [
        { key: "F", label: "试验力 F", unit: "kgf" },
        { key: "D", label: "球直径 D", unit: "mm" },
        { key: "d", label: "压痕直径 d", unit: "mm" }
      ],
      outputs: [{ label: "布氏硬度 HB", unit: "" }],
      computeRows(rows) {
        return rows.map(r => {
          const F = Number(r.F), D = Number(r.D), d = Number(r.d);
          const HB = 2 * F / (Math.PI * D * (D - Math.sqrt(D * D - d * d)));
          return [round(HB, 1)];
        });
      }
    },

    material_04: {
      title: "X射线衍射物相分析 · 数据处理",
      hint: "输入 X 射线波长 λ（nm）、衍射角 θ（°）与衍射级 n，自动算晶面间距 d 与 2θ。",
      inputs: [
        { key: "lam", label: "波长 λ", unit: "nm" },
        { key: "th", label: "衍射角 θ", unit: "°" },
        { key: "n", label: "衍射级 n", unit: "" }
      ],
      outputs: [
        { label: "晶面间距 d", unit: "nm" },
        { label: "2θ", unit: "°" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const lam = Number(r.lam), th = Number(r.th), n = Number(r.n) || 1;
          const d = n * lam / (2 * Math.sin(th * Math.PI / 180));
          return [round(d, 4), round(2 * th, 2)];
        });
      }
    },

    metalmat_04: {
      title: "晶粒度测定 · 数据处理",
      hint: "输入平均截距长度 ℓ（mm），按 ASTM E112 算晶粒度级别 G 与单位面积晶粒数 N_A。",
      inputs: [{ key: "l", label: "平均截距 ℓ", unit: "mm" }],
      outputs: [
        { label: "晶粒度 G", unit: "" },
        { label: "晶粒数 N_A", unit: "个/mm²" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const l = Number(r.l);
          const G = 1 - 2 * Math.log(l) / Math.log(2);
          const NA = Math.pow(2, G - 1);
          return [round(G, 2), round(NA, 1)];
        });
      }
    },

    nonmetal_01: {
      title: "水泥标准稠度用水量 · 数据处理",
      hint: "输入拌合水质量 m_w 与水泥质量 m_c（g），自动算标准稠度用水量 P。",
      inputs: [
        { key: "mw", label: "拌合水 m_w", unit: "g" },
        { key: "mc", label: "水泥 m_c", unit: "g" }
      ],
      outputs: [{ label: "用水量 P", unit: "%" }],
      computeRows(rows) {
        return rows.map(r => {
          const mw = Number(r.mw), mc = Number(r.mc);
          return [round(mw / mc * 100, 1)];
        });
      }
    },

    nonmetal_02: {
      title: "陶瓷烧结密度 · 数据处理",
      hint: "输入干质量、饱和表干质量、水中质量（g）与水密度，按排水法算表观密度。",
      inputs: [
        { key: "md", label: "干质量 m_dry", unit: "g" },
        { key: "ms", label: "表干质量 m_sat", unit: "g" },
        { key: "msp", label: "水中质量 m_susp", unit: "g" },
        { key: "rw", label: "水密度 ρ_w", unit: "g/cm³" }
      ],
      outputs: [{ label: "表观密度 ρ", unit: "g/cm³" }],
      computeRows(rows) {
        return rows.map(r => {
          const md = Number(r.md), ms = Number(r.ms), msp = Number(r.msp), rw = Number(r.rw) || 1.0;
          const rho = md * rw / (ms - msp);
          return [round(rho, 3)];
        });
      }
    },

    nonmetal_03: {
      title: "玻璃折射率测定 · 数据处理",
      hint: "输入棱镜顶角 A 与最小偏向角 D（°），按最小偏向角法算折射率 n。",
      inputs: [
        { key: "A", label: "顶角 A", unit: "°" },
        { key: "D", label: "最小偏向角 D", unit: "°" }
      ],
      outputs: [{ label: "折射率 n", unit: "" }],
      computeRows(rows) {
        return rows.map(r => {
          const A = Number(r.A), D = Number(r.D);
          const n = Math.sin((A + D) / 2 * Math.PI / 180) / Math.sin(A / 2 * Math.PI / 180);
          return [round(n, 4)];
        });
      }
    },

    // 电路与电子技术
    electrical_01: {
      title: "单相变压器空载短路 · 变比",
      hint: "输入高压侧电压 U1 与低压侧空载电压 U20（V），自动算变比 k。",
      inputs: [
        { key: "U1", label: "高压侧 U1", unit: "V" },
        { key: "U20", label: "低压空载 U20", unit: "V" }
      ],
      outputs: [{ label: "变比 k", unit: "" }],
      computeRows(rows) {
        return rows.map(r => {
          const U1 = Number(r.U1), U20 = Number(r.U20);
          return [round(U1 / U20, 3)];
        });
      }
    },

    electrical_03: {
      title: "日光灯功率因数提高 · 数据处理",
      hint: "输入有功功率 P（W）、电压 U、电流 I，自动算功率因数 cosφ1 及补偿到 cosφ2 所需电容 C。",
      inputs: [
        { key: "P", label: "有功功率 P", unit: "W" },
        { key: "U", label: "电压 U", unit: "V" },
        { key: "I", label: "电流 I", unit: "A" },
        { key: "c2", label: "目标 cosφ2", unit: "" }
      ],
      outputs: [
        { label: "cosφ1", unit: "" },
        { label: "补偿电容 C", unit: "µF" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const P = Number(r.P), U = Number(r.U), I = Number(r.I), c2 = Number(r.c2) || 0.95;
          const pf = Math.min(1, Math.max(0, P / (U * I)));
          const phi1 = Math.acos(pf), phi2 = Math.acos(c2);
          const C = P / (2 * Math.PI * 50 * U * U) * (Math.tan(phi1) - Math.tan(phi2)) * 1e6;
          return [round(pf, 3), round(C, 1)];
        });
      }
    },

    electrical_04: {
      title: "戴维南定理验证 · 数据处理",
      hint: "输入开路电压 U_oc 与短路电流 I_sc（V、A），自动算等效内阻 R_th 与最大功率。",
      inputs: [
        { key: "Voc", label: "开路电压 U_oc", unit: "V" },
        { key: "Isc", label: "短路电流 I_sc", unit: "A" }
      ],
      outputs: [
        { label: "等效内阻 R_th", unit: "Ω" },
        { label: "最大功率 P_max", unit: "W" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const Voc = Number(r.Voc), Isc = Number(r.Isc);
          const Rth = Voc / Isc;
          const Pmax = Voc * Voc / (4 * Rth);
          return [round(Rth, 2), round(Pmax, 3)];
        });
      }
    },

    elecinfo_02: {
      title: "晶体管静态工作点 · 数据处理",
      hint: "输入 V_CC、V_BE、基极电阻 R_B、电流放大倍数 β 与集电极电阻 R_C（kΩ），算 I_B、I_C、V_CE。",
      inputs: [
        { key: "VCC", label: "V_CC", unit: "V" },
        { key: "VBE", label: "V_BE", unit: "V" },
        { key: "RB", label: "R_B", unit: "kΩ" },
        { key: "beta", label: "β", unit: "" },
        { key: "RC", label: "R_C", unit: "kΩ" }
      ],
      outputs: [
        { label: "I_B", unit: "µA" },
        { label: "I_C", unit: "mA" },
        { label: "V_CE", unit: "V" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const VCC = Number(r.VCC), VBE = Number(r.VBE) || 0.7;
          const RB = Number(r.RB), beta = Number(r.beta), RC = Number(r.RC);
          const IB = (VCC - VBE) / (RB * 1000);
          const IC = beta * IB;
          const VCE = VCC - IC * RC * 1000;
          return [round(IB * 1e6, 1), round(IC * 1e3, 2), round(VCE, 2)];
        });
      }
    },

    elecinfo_03: {
      title: "运算放大器比例运算 · 数据处理",
      hint: "输入反向比例运放的 R_in、R_f（kΩ）与输入 V_in（V），自动算输出 V_out 与放大倍数。",
      inputs: [
        { key: "Rin", label: "R_in", unit: "kΩ" },
        { key: "Rf", label: "R_f", unit: "kΩ" },
        { key: "Vin", label: "V_in", unit: "V" }
      ],
      outputs: [
        { label: "V_out", unit: "V" },
        { label: "放大倍数 A_v", unit: "" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const Rin = Number(r.Rin), Rf = Number(r.Rf), Vin = Number(r.Vin);
          const Av = -Rf / Rin;
          return [round(Av * Vin, 3), round(Av, 2)];
        });
      }
    },

    elecinfo_04: {
      title: "RLC串联谐振 · 数据处理",
      hint: "输入 R（Ω）、电感 L（mH）、电容 C（µF），自动算谐振频率 f0、品质因数 Q 与带宽。",
      inputs: [
        { key: "R", label: "电阻 R", unit: "Ω" },
        { key: "L", label: "电感 L", unit: "mH" },
        { key: "C", label: "电容 C", unit: "µF" }
      ],
      outputs: [
        { label: "谐振频率 f0", unit: "kHz" },
        { label: "品质因数 Q", unit: "" },
        { label: "带宽 BW", unit: "kHz" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const R = Number(r.R), L = Number(r.L) / 1000, C = Number(r.C) / 1e6;
          const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
          const Q = (1 / R) * Math.sqrt(L / C);
          const BW = f0 / Q;
          return [round(f0 / 1000, 3), round(Q, 1), round(BW / 1000, 3)];
        });
      }
    },

    comm_01: {
      title: "振幅调制与解调 · 调幅度",
      hint: "输入调幅波峰值 V_max 与谷值 V_min（V），自动算调幅度 m_a。",
      inputs: [
        { key: "Vmax", label: "峰值 V_max", unit: "V" },
        { key: "Vmin", label: "谷值 V_min", unit: "V" }
      ],
      outputs: [
        { label: "调幅度 m_a", unit: "%" },
        { label: "载波幅值", unit: "V" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const Vmax = Number(r.Vmax), Vmin = Number(r.Vmin);
          const ma = (Vmax - Vmin) / (Vmax + Vmin);
          return [round(ma * 100, 1), round((Vmax + Vmin) / 2, 2)];
        });
      }
    },

    comm_02: {
      title: "抽样定理与PCM · 量化",
      hint: "输入量化位数 n，自动算量化电平数 L 与理论信噪比 SQNR。",
      inputs: [{ key: "n", label: "量化位数 n", unit: "bit" }],
      outputs: [
        { label: "量化电平数 L", unit: "" },
        { label: "SQNR", unit: "dB" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const n = Number(r.n);
          const L = Math.pow(2, n);
          const sqnr = 6.02 * n + 1.76;
          return [L, round(sqnr, 2)];
        });
      }
    },

    comm_03: {
      title: "光纤通信特性测试 · 衰减",
      hint: "输入输入/输出光功率（同单位）与光纤长度 L（km），自动算衰减系数 α。",
      inputs: [
        { key: "Pin", label: "输入功率 P_in", unit: "" },
        { key: "Pout", label: "输出功率 P_out", unit: "" },
        { key: "L", label: "光纤长度 L", unit: "km" }
      ],
      outputs: [{ label: "衰减系数 α", unit: "dB/km" }],
      computeRows(rows) {
        return rows.map(r => {
          const Pin = Number(r.Pin), Pout = Number(r.Pout), L = Number(r.L);
          const alpha = (10 / L) * Math.log10(Pin / Pout);
          return [round(alpha, 3)];
        });
      }
    },

    // 化工原理
    chemeng_01: {
      title: "精馏塔全塔效率 · 数据处理",
      hint: "输入理论板数 N_t 与实际板数 N_p，自动算全塔效率 E。",
      inputs: [
        { key: "Nt", label: "理论板数 N_t", unit: "" },
        { key: "Np", label: "实际板数 N_p", unit: "" }
      ],
      outputs: [{ label: "全塔效率 E", unit: "%" }],
      computeRows(rows) {
        return rows.map(r => {
          const Nt = Number(r.Nt), Np = Number(r.Np);
          return [round(Nt / Np * 100, 1)];
        });
      }
    },

    chemeng_03: {
      title: "反应动力学 · 速率常数",
      hint: "输入初始浓度 C0、t 时刻浓度 C 与时间 t（min），同时给出一级与二级速率常数。",
      inputs: [
        { key: "C0", label: "初始浓度 C0", unit: "" },
        { key: "C", label: "t时浓度 C", unit: "" },
        { key: "t", label: "时间 t", unit: "min" }
      ],
      outputs: [
        { label: "一级 k1", unit: "/min" },
        { label: "二级 k2", unit: "" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const C0 = Number(r.C0), C = Number(r.C), t = Number(r.t);
          const k1 = (1 / t) * Math.log(C0 / C);
          const k2 = (1 / t) * (1 / C - 1 / C0);
          return [round(k1, 5), round(k2, 5)];
        });
      }
    },

    chemeng_04: {
      title: "干燥速率曲线 · 数据处理",
      hint: "输入失水量 Δm（g）、试样面积 A（cm²）与时间间隔 Δt（min），自动算干燥速率。",
      inputs: [
        { key: "dm", label: "失水量 Δm", unit: "g" },
        { key: "A", label: "面积 A", unit: "cm²" },
        { key: "dt", label: "时间间隔 Δt", unit: "min" }
      ],
      outputs: [{ label: "干燥速率 U", unit: "g/(cm²·min)" }],
      computeRows(rows) {
        return rows.map(r => {
          const dm = Number(r.dm), A = Number(r.A), dt = Number(r.dt);
          return [round(dm / (A * dt), 5)];
        });
      }
    },

    // 环境监测 / 食品工程 / 安全
    environment_01: {
      title: "化学需氧量COD测定 · 数据处理",
      hint: "输入空白滴定 V0、水样滴定 V1（mL）、硫酸亚铁铵浓度 c（mol/L）与水样体积 Vs（mL），算 COD。",
      inputs: [
        { key: "V0", label: "空白 V0", unit: "mL" },
        { key: "V1", label: "水样 V1", unit: "mL" },
        { key: "c", label: "浓度 c", unit: "mol/L" },
        { key: "Vs", label: "水样体积 Vs", unit: "mL" }
      ],
      outputs: [{ label: "COD", unit: "mg/L" }],
      computeRows(rows) {
        return rows.map(r => {
          const V0 = Number(r.V0), V1 = Number(r.V1), c = Number(r.c), Vs = Number(r.Vs);
          const COD = (V0 - V1) * c * 8000 / Vs;
          return [round(COD, 1)];
        });
      }
    },

    food_02: {
      title: "凯氏定氮 · 数据处理",
      hint: "输入样品滴定 V、空白 V0（mL）、盐酸浓度 c（mol/L）与样品质量 m（g），算粗蛋白与氮含量。",
      inputs: [
        { key: "V", label: "样品滴定 V", unit: "mL" },
        { key: "V0", label: "空白 V0", unit: "mL" },
        { key: "c", label: "浓度 c", unit: "mol/L" },
        { key: "m", label: "样品质量 m", unit: "g" }
      ],
      outputs: [
        { label: "粗蛋白", unit: "%" },
        { label: "氮含量 N", unit: "%" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const V = Number(r.V), V0 = Number(r.V0), c = Number(r.c), m = Number(r.m);
          const Npct = (V - V0) * c * 0.014 * 100 / m;
          return [round(Npct * 6.25, 2), round(Npct, 3)];
        });
      }
    },

    food_03: {
      title: "黏度测定（毛细管法） · 数据处理",
      hint: "输入参比黏度 η_ref、样品密度 ρ、流出时间 t 及参比密度/时间，按奥氏法算样品黏度。",
      inputs: [
        { key: "er", label: "参比黏度 η_ref", unit: "mPa·s" },
        { key: "rho", label: "样品密度 ρ", unit: "g/cm³" },
        { key: "t", label: "样品时间 t", unit: "s" },
        { key: "rr", label: "参比密度 ρ_ref", unit: "g/cm³" },
        { key: "tr", label: "参比时间 t_ref", unit: "s" }
      ],
      outputs: [{ label: "样品黏度 η", unit: "mPa·s" }],
      computeRows(rows) {
        return rows.map(r => {
          const er = Number(r.er), rho = Number(r.rho), t = Number(r.t);
          const rr = Number(r.rr), tr = Number(r.tr);
          const eta = er * (rho * t) / (rr * tr);
          return [round(eta, 3)];
        });
      }
    },

    food_04: {
      title: "杀菌F值计算 · 致死率",
      hint: "输入杀菌温度 T（℃）与温度系数 z（默认10℃），算该温度点致死率 L；F0 = Σ(L·Δt)。",
      inputs: [
        { key: "T", label: "温度 T", unit: "℃" },
        { key: "z", label: "温度系数 z", unit: "℃" }
      ],
      outputs: [{ label: "致死率 L", unit: "" }],
      computeRows(rows) {
        return rows.map(r => {
          const T = Number(r.T), z = Number(r.z) || 10;
          const L = Math.pow(10, (T - 121.1) / z);
          return [round(L, 4)];
        });
      }
    },

    food_01: {
      title: "水分活度测定 · 数据处理",
      hint: "输入平衡相对湿度 ERH（%），自动算水分活度 A_w。",
      inputs: [{ key: "ERH", label: "平衡湿度 ERH", unit: "%" }],
      outputs: [{ label: "水分活度 A_w", unit: "" }],
      computeRows(rows) {
        return rows.map(r => {
          const ERH = Number(r.ERH);
          return [round(ERH / 100, 3)];
        });
      }
    },

    safety_02: {
      title: "粉尘浓度测定 · 数据处理",
      hint: "输入采样前后滤膜质量 m1/m2（mg）、流量 Q（L/min）与时间 t（min），算粉尘浓度。",
      inputs: [
        { key: "m1", label: "滤膜前 m1", unit: "mg" },
        { key: "m2", label: "滤膜后 m2", unit: "mg" },
        { key: "Q", label: "流量 Q", unit: "L/min" },
        { key: "t", label: "时间 t", unit: "min" }
      ],
      outputs: [{ label: "粉尘浓度 C", unit: "mg/m³" }],
      computeRows(rows) {
        return rows.map(r => {
          const m1 = Number(r.m1), m2 = Number(r.m2), Q = Number(r.Q), t = Number(r.t);
          const C = (m2 - m1) * 1000 / (Q * t);
          return [round(C, 3)];
        });
      }
    },

    safety_03: {
      title: "接地电阻测量 · 数据处理",
      hint: "输入测量电压 V 与电流 I，自动算接地电阻 R。",
      inputs: [
        { key: "V", label: "电压 V", unit: "V" },
        { key: "I", label: "电流 I", unit: "A" }
      ],
      outputs: [{ label: "接地电阻 R", unit: "Ω" }],
      computeRows(rows) {
        return rows.map(r => {
          const V = Number(r.V), I = Number(r.I);
          return [round(V / I, 3)];
        });
      }
    },

    // 水力学 / 农业
    water_01: {
      title: "颗粒自由沉淀 · 数据处理",
      hint: "输入颗粒密度 ρs、流体密度 ρ、颗粒直径 d（mm）与动力黏度 μ，按 Stokes 定律算沉降速度。",
      inputs: [
        { key: "rhos", label: "颗粒密度 ρs", unit: "kg/m³" },
        { key: "rho", label: "流体密度 ρ", unit: "kg/m³" },
        { key: "d", label: "直径 d", unit: "mm" },
        { key: "mu", label: "动力黏度 μ", unit: "Pa·s" }
      ],
      outputs: [{ label: "沉降速度 u", unit: "mm/s" }],
      computeRows(rows) {
        return rows.map(r => {
          const rhos = Number(r.rhos), rho = Number(r.rho) || 1000;
          const d = Number(r.d) / 1000, mu = Number(r.mu) || 1.0e-3;
          const u = 9.81 * (rhos - rho) * d * d / (18 * mu) * 1000;
          return [round(u, 4)];
        });
      }
    },

    water_04: {
      title: "活性污泥沉降比 · 数据处理",
      hint: "输入 30min 沉降污泥体积与混合液体积（mL），自动算 SV30。",
      inputs: [
        { key: "Vset", label: "沉降体积", unit: "mL" },
        { key: "Vtot", label: "混合液体积", unit: "mL" }
      ],
      outputs: [{ label: "SV30", unit: "%" }],
      computeRows(rows) {
        return rows.map(r => {
          const Vset = Number(r.Vset), Vtot = Number(r.Vtot);
          return [round(Vset / Vtot * 100, 1)];
        });
      }
    },

    agriculture_01: {
      title: "土壤含水率测定 · 数据处理",
      hint: "输入湿土质量 m_wet 与烘干质量 m_dry（g），按干基算含水率 w。",
      inputs: [
        { key: "mwet", label: "湿土 m_wet", unit: "g" },
        { key: "mdry", label: "烘干 m_dry", unit: "g" }
      ],
      outputs: [{ label: "含水率 w", unit: "%" }],
      computeRows(rows) {
        return rows.map(r => {
          const mwet = Number(r.mwet), mdry = Number(r.mdry);
          return [round((mwet - mdry) / mdry * 100, 2)];
        });
      }
    },

    // 机械 / 热力 / 车辆 / 地质 / 采矿
    mech_04: {
      title: "纯弯曲梁正应力 · 数据处理",
      hint: "输入弯矩 M（N·m）、距中性轴 y（mm）、矩形截面宽 b 与高 h（mm），算惯性矩 I 与正应力 σ。",
      inputs: [
        { key: "M", label: "弯矩 M", unit: "N·m" },
        { key: "y", label: "距轴 y", unit: "mm" },
        { key: "b", label: "宽 b", unit: "mm" },
        { key: "h", label: "高 h", unit: "mm" }
      ],
      outputs: [
        { label: "惯性矩 I", unit: "mm⁴" },
        { label: "正应力 σ", unit: "MPa" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const M = Number(r.M), y = Number(r.y), b = Number(r.b), h = Number(r.h);
          const I = b * Math.pow(h, 3) / 12;
          const sigma = M * 1000 * y / I;
          return [round(I, 0), round(sigma, 2)];
        });
      }
    },

    mech_02: {
      title: "带传动效率 · 数据处理",
      hint: "输入紧边拉力 F1、松边拉力 F2（N）与带速 v（m/s），自动算有效拉力与有效功率。",
      inputs: [
        { key: "F1", label: "紧边拉力 F1", unit: "N" },
        { key: "F2", label: "松边拉力 F2", unit: "N" },
        { key: "v", label: "带速 v", unit: "m/s" }
      ],
      outputs: [
        { label: "有效拉力 F_e", unit: "N" },
        { label: "有效功率 P", unit: "kW" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const F1 = Number(r.F1), F2 = Number(r.F2), v = Number(r.v);
          const Fe = F1 - F2;
          return [round(Fe, 1), round(Fe * v / 1000, 3)];
        });
      }
    },

    energy_02: {
      title: "锅炉热效率 · 数据处理",
      hint: "输入蒸发量 D、蒸汽焓 h_g、给水焓 h_fw、燃料耗量 B 与低位热值 Q_net，按正平衡算效率。",
      inputs: [
        { key: "D", label: "蒸发量 D", unit: "kg/h" },
        { key: "hg", label: "蒸汽焓 h_g", unit: "kJ/kg" },
        { key: "hfw", label: "给水焓 h_fw", unit: "kJ/kg" },
        { key: "B", label: "燃料耗量 B", unit: "kg/h" },
        { key: "Qnet", label: "低位热值 Q_net", unit: "kJ/kg" }
      ],
      outputs: [{ label: "锅炉效率 η", unit: "%" }],
      computeRows(rows) {
        return rows.map(r => {
          const D = Number(r.D), hg = Number(r.hg), hfw = Number(r.hfw);
          const B = Number(r.B), Qnet = Number(r.Qnet);
          return [round(D * (hg - hfw) / (B * Qnet) * 100, 2)];
        });
      }
    },

    energy_04: {
      title: "蒸汽轮机功率 · 数据处理",
      hint: "输入蒸汽流量 m（kg/s）、焓降 Δh（kJ/kg）与相对内效率 η，自动算功率。",
      inputs: [
        { key: "m", label: "流量 m", unit: "kg/s" },
        { key: "dh", label: "焓降 Δh", unit: "kJ/kg" },
        { key: "eta", label: "内效率 η", unit: "" }
      ],
      outputs: [{ label: "功率 P", unit: "kW" }],
      computeRows(rows) {
        return rows.map(r => {
          const m = Number(r.m), dh = Number(r.dh), eta = Number(r.eta) || 0.85;
          return [round(eta * m * dh, 2)];
        });
      }
    },

    building_02: {
      title: "围护结构传热系数 · 数据处理",
      hint: "输入稳态传热速率 Φ（W）、面积 A 与温差 ΔT，自动算传热系数 K。",
      inputs: [
        { key: "Phi", label: "传热速率 Φ", unit: "W" },
        { key: "A", label: "面积 A", unit: "m²" },
        { key: "dT", label: "温差 ΔT", unit: "K" }
      ],
      outputs: [{ label: "传热系数 K", unit: "W/(m²·K)" }],
      computeRows(rows) {
        return rows.map(r => {
          const Phi = Number(r.Phi), A = Number(r.A), dT = Number(r.dT);
          return [round(Phi / (A * dT), 3)];
        });
      }
    },

    building_03: {
      title: "空调系统焓差法 · 数据处理",
      hint: "输入风量 m（kg/s）、进口比焓 h_in 与出口比焓 h_out（kJ/kg），自动算制冷量。",
      inputs: [
        { key: "m", label: "风量 m", unit: "kg/s" },
        { key: "hin", label: "进口焓 h_in", unit: "kJ/kg" },
        { key: "hout", label: "出口焓 h_out", unit: "kJ/kg" }
      ],
      outputs: [{ label: "制冷量 Q", unit: "kW" }],
      computeRows(rows) {
        return rows.map(r => {
          const m = Number(r.m), hin = Number(r.hin), hout = Number(r.hout);
          return [round(m * (hin - hout), 2)];
        });
      }
    },

    building_04: {
      title: "散热器散热量 · 数据处理",
      hint: "输入传热系数 K、散热面积 A 与平均温差 ΔT_m，自动算散热量 Q。",
      inputs: [
        { key: "K", label: "传热系数 K", unit: "W/(m²·K)" },
        { key: "A", label: "面积 A", unit: "m²" },
        { key: "dTm", label: "平均温差 ΔT_m", unit: "K" }
      ],
      outputs: [{ label: "散热量 Q", unit: "W" }],
      computeRows(rows) {
        return rows.map(r => {
          const K = Number(r.K), A = Number(r.A), dTm = Number(r.dTm);
          return [round(K * A * dTm, 1)];
        });
      }
    },

    agriculture_04: {
      title: "谷物干燥特性 · 含水率",
      hint: "输入湿基质量 m_wet 与干燥后质量 m_dry（g），按干基算含水率 w。",
      inputs: [
        { key: "mwet", label: "湿基 m_wet", unit: "g" },
        { key: "mdry", label: "干基 m_dry", unit: "g" }
      ],
      outputs: [{ label: "含水率 w", unit: "%" }],
      computeRows(rows) {
        return rows.map(r => {
          const mwet = Number(r.mwet), mdry = Number(r.mdry);
          return [round((mwet - mdry) / mdry * 100, 2)];
        });
      }
    },

    energy_03: {
      title: "热电偶校准 · 数据处理",
      hint: "输入塞贝克系数 S（µV/℃）与测得热电动势 E（µV），自动算相对参考端的温差。",
      inputs: [
        { key: "S", label: "塞贝克系数 S", unit: "µV/℃" },
        { key: "E", label: "热电动势 E", unit: "µV" }
      ],
      outputs: [{ label: "温差 ΔT", unit: "℃" }],
      computeRows(rows) {
        return rows.map(r => {
          const S = Number(r.S), E = Number(r.E);
          return [round(E / S, 2)];
        });
      }
    },

    vehicle_01: {
      title: "发动机台架性能 · 数据处理",
      hint: "输入扭矩 T（N·m）与转速 n（rpm），自动算有效功率 P_e。",
      inputs: [
        { key: "T", label: "扭矩 T", unit: "N·m" },
        { key: "n", label: "转速 n", unit: "rpm" }
      ],
      outputs: [{ label: "有效功率 P_e", unit: "kW" }],
      computeRows(rows) {
        return rows.map(r => {
          const T = Number(r.T), n = Number(r.n);
          return [round(T * n / 9550, 2)];
        });
      }
    },

    vehicle_03: {
      title: "制动性能道路试验 · 数据处理",
      hint: "输入初速度 v（km/h）与制动距离 s（m），自动算平均减速度 a 及折合重力加速度。",
      inputs: [
        { key: "v", label: "初速度 v", unit: "km/h" },
        { key: "s", label: "制动距离 s", unit: "m" }
      ],
      outputs: [
        { label: "减速度 a", unit: "m/s²" },
        { label: "折合 g", unit: "g" }
      ],
      computeRows(rows) {
        return rows.map(r => {
          const v = Number(r.v) / 3.6, s = Number(r.s);
          const a = v * v / (2 * s);
          return [round(a, 2), round(a / 9.81, 2)];
        });
      }
    },

    aircraft_03: {
      title: "铆接接头强度 · 数据处理",
      hint: "输入破坏载荷 F（N）、铆钉数 n 与铆钉直径 d（mm），自动算单剪平均剪应力。",
      inputs: [
        { key: "F", label: "破坏载荷 F", unit: "N" },
        { key: "n", label: "铆钉数 n", unit: "" },
        { key: "d", label: "直径 d", unit: "mm" }
      ],
      outputs: [{ label: "剪应力 τ", unit: "MPa" }],
      computeRows(rows) {
        return rows.map(r => {
          const F = Number(r.F), n = Number(r.n), d = Number(r.d);
          const A = Math.PI * d * d / 4;
          return [round(F / (n * A), 2)];
        });
      }
    },

    geology_01: {
      title: "岩石单轴抗压强度 · 数据处理",
      hint: "输入立方边长 a（mm）与破坏荷载 P（kN），自动算抗压强度 σc。",
      inputs: [
        { key: "a", label: "边长 a", unit: "mm" },
        { key: "P", label: "破坏荷载 P", unit: "kN" }
      ],
      outputs: [{ label: "抗压强度 σc", unit: "MPa" }],
      computeRows(rows) {
        return rows.map(r => {
          const a = Number(r.a), P = Number(r.P);
          return [round(P * 1000 / (a * a), 2)];
        });
      }
    },

    geology_02: {
      title: "土的直接剪切 · 数据处理",
      hint: "输入黏聚力 c（kPa）、内摩擦角 φ（°）与法向应力 σ（kPa），按莫尔-库仑算抗剪强度 τ。",
      inputs: [
        { key: "c", label: "黏聚力 c", unit: "kPa" },
        { key: "phi", label: "内摩擦角 φ", unit: "°" },
        { key: "sigma", label: "法向应力 σ", unit: "kPa" }
      ],
      outputs: [{ label: "抗剪强度 τ", unit: "kPa" }],
      computeRows(rows) {
        return rows.map(r => {
          const c = Number(r.c), phi = Number(r.phi), sigma = Number(r.sigma);
          const tau = c + sigma * Math.tan(phi * Math.PI / 180);
          return [round(tau, 2)];
        });
      }
    },

    mining_02: {
      title: "岩石点荷载强度 · 数据处理",
      hint: "输入破坏荷载 P（kN）与等效岩芯直径 D_e（mm），自动算点荷载强度指数 I_s。",
      inputs: [
        { key: "P", label: "破坏荷载 P", unit: "kN" },
        { key: "De", label: "等效直径 D_e", unit: "mm" }
      ],
      outputs: [{ label: "点荷载指数 I_s", unit: "MPa" }],
      computeRows(rows) {
        return rows.map(r => {
          const P = Number(r.P), De = Number(r.De);
          return [round(P * 1000 / (De * De), 2)];
        });
      }
    },

    mining_01: {
      title: "煤坚固性系数 · 数据处理",
      hint: "输入岩石单轴抗压强度 σc（MPa），按普氏公式算坚固性系数 f。",
      inputs: [{ key: "sc", label: "抗压强度 σc", unit: "MPa" }],
      outputs: [{ label: "坚固性系数 f", unit: "" }],
      computeRows(rows) {
        return rows.map(r => {
          const sc = Number(r.sc);
          return [round(sc / 10, 2)];
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
