# -*- coding: utf-8 -*-
# 把小程序已有的 JSON 数据转换为网站可用的全局变量文件。
# 运行：python converter.py  （需在 web/ 目录下，或改下面的路径）
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "..", "lab-report-miniprogram", "data")
OUT = os.path.join(BASE, "data", "site-data.js")


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
    "building_01": "fluid_mech",       # 风管风量测定
    "aircraft_02": "fluid_mech",       # 翼型风洞测压
    "navigation_04": "fluid_mech",     # 船舶 Z 形操纵
    "energy_03": "heat_transfer",      # 热电偶校准
    "building_02": "heat_transfer",    # 围护结构传热系数
    "building_04": "heat_transfer",    # 散热器散热量
    "agriculture_04": "heat_transfer", # 谷物干燥
    "energy_02": "thermo",             # 锅炉热效率
    "energy_04": "thermo",             # 蒸汽轮机功率
    "building_03": "thermo",           # 空调焓差法
    "vehicle_01": "thermo",            # 发动机台架
    # 力学 / 材料
    "exp_metal_tensile": "eng_mechanics",
    "exp_rebar_tensile": "eng_mechanics",
    "exp_aircraft_tensile": "eng_mechanics",
    "mech_04": "eng_mechanics",        # 纯弯曲梁正应力
    "vehicle_02": "eng_mechanics",     # 悬架特性
    "vehicle_03": "eng_mechanics",     # 制动性能
    "aircraft_03": "eng_mechanics",    # 铆接接头强度
    "agriculture_03": "eng_mechanics", # 拖拉机牵引
    "exp_concrete_compression": "struct_mech",
    "exp_soil_consolidation": "soil_mech",
    "geology_02": "soil_mech",         # 土的直接剪切
    "agriculture_01": "soil_mech",     # 土壤含水率
    "exp_metalmat_tensile": "eng_material",
    "material_02": "eng_material",     # 金相显微镜
    "material_03": "eng_material",     # 布氏硬度
    "material_04": "eng_material",     # X 射线衍射
    "metalmat_02": "eng_material",     # 回复再结晶
    "metalmat_03": "eng_material",     # 淬火温度硬度
    "metalmat_04": "eng_material",     # 晶粒度
    "nonmetal_01": "eng_material",     # 水泥稠度
    "nonmetal_02": "eng_material",     # 陶瓷烧结密度
    "nonmetal_03": "eng_material",     # 玻璃折射率
    "nonmetal_04": "eng_material",     # 耐火度
    # 机械
    "mech_01": "mech_design",          # 零件测绘与公差
    "mech_02": "mech_design",          # 带传动效率
    "mech_03": "mech_principle",       # 机构运动简图
    "vehicle_04": "mech_design",       # 变速器传动效率
    "aircraft_04": "mfg_base",         # 数控机床加工精度
    # 电路 / 电子 / 控制 / 信号
    "exp_wheatstone": "circuit",
    "electrical_01": "circuit",        # 变压器空载短路
    "electrical_03": "circuit",        # 日光灯功率因数
    "electrical_04": "circuit",        # 戴维南定理
    "elecinfo_04": "circuit",          # RLC 串联谐振
    "electrical_02": "electromag",     # 异步电动机特性
    "elecinfo_02": "electronics",      # 晶体管放大
    "elecinfo_03": "electronics",      # 运算放大器
    "comm_04": "electronics",          # 锁相环
    "comm_01": "signal_system",        # 调制解调
    "comm_02": "signal_system",        # 抽样定理 PCM
    "comm_03": "signal_system",        # 光纤通信
    "automation_01": "control",        # 阶跃响应
    "automation_02": "control",        # PID 整定
    "automation_03": "control",        # 温度检测变送
    "automation_04": "control",        # 水箱液位控制
    # 化工原理
    "process_04": "chem_principle",    # 恒压过滤
    "chemeng_01": "chem_principle",    # 精馏
    "chemeng_02": "chem_principle",    # 吸收
    "chemeng_03": "chem_principle",    # 反应动力学
    "chemeng_04": "chem_principle",    # 干燥
    # 测量 / 水力学 / 环境 / 安全 / 地质 / 采矿 / 食品 / 工程管理
    "civil_04": "surveying",           # 水准测量
    "surveying_01": "surveying",
    "surveying_02": "surveying",
    "surveying_03": "surveying",
    "surveying_04": "surveying",
    "navigation_01": "surveying",      # 罗经差
    "navigation_02": "surveying",      # 测深仪
    "navigation_03": "surveying",      # 六分仪
    "water_01": "hydraulics",          # 颗粒自由沉淀
    "water_02": "hydraulics",          # 过滤池
    "water_03": "hydraulics",          # 管网水力
    "agriculture_02": "hydraulics",    # 喷头水量分布
    "water_04": "env_monitor",         # 活性污泥沉降比
    "environment_01": "env_monitor",   # COD
    "environment_02": "env_monitor",   # 曝气充氧
    "environment_03": "env_monitor",   # 比耗氧速率
    "environment_04": "env_monitor",   # 噪声声级
    "safety_01": "safety",
    "safety_02": "safety",
    "safety_03": "safety",
    "safety_04": "safety",
    "geology_01": "geology_base",      # 岩石抗压
    "geology_03": "geology_base",      # 地质罗盘
    "geology_04": "geology_base",      # 钻探岩芯
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


def main():
    majors = load("majors.json")
    courses = load("courses.json")
    experiments = enrich(load("experiments.json"))

    site_data = {
        "majors": majors,
        "courses": courses,
        "experiments": experiments,
    }

    header = (
        "// 本文件由 converter.py 自动生成，请勿手改。\n"
        "// 数据来源：小程序 lab-report-miniprogram/data/*.json\n"
        "// 重要：全部实验数据均为 AI 虚构仿写演示样例，仅供报告格式参考，严禁直接提交作业。\n"
    )

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(header)
        f.write("window.SITE_DATA = ")
        f.write(json.dumps(site_data, ensure_ascii=False, indent=1))
        f.write(";\n")

    print("OK: 写入", OUT)
    print("实验数:", len(experiments), " 专业数:", len(majors), " 课程数:", len(courses))


if __name__ == "__main__":
    main()
