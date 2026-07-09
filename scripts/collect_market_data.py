#!/usr/bin/env python3
"""
Collect daily market data and emit a D1 import SQL file.

The script uses AKShare for A-share data and yfinance for offshore anchors.
It is intended for personal research and scheduled GitHub Actions runs.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
import os
import pathlib
from typing import Any, Optional


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "tmp" / "d1-import.sql"


def sql_quote(value: Any) -> str:
  if value is None:
    return "NULL"
  if isinstance(value, float) and math.isnan(value):
    return "NULL"
  return "'" + str(value).replace("'", "''") + "'"


def utc_now() -> str:
  return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def github_log_url() -> str | None:
  server = os.getenv("GITHUB_SERVER_URL")
  repo = os.getenv("GITHUB_REPOSITORY")
  run_id = os.getenv("GITHUB_RUN_ID")
  if server and repo and run_id:
    return f"{server}/{repo}/actions/runs/{run_id}"
  return None


def collection_run_sql(
  source_id: str,
  status: str,
  started_at: str,
  finished_at: str,
  rows_written: int,
  message: str,
  raw: Optional[dict[str, Any]] = None,
) -> str:
  run_id = f"{source_id}-{started_at.replace(':', '').replace('.', '').replace('Z', '')}"
  return (
    "INSERT OR REPLACE INTO data_collection_runs "
    "(id, source_id, status, started_at, finished_at, rows_written, message, log_url, raw_json) "
    f"VALUES ({sql_quote(run_id)}, {sql_quote(source_id)}, {sql_quote(status)}, "
    f"{sql_quote(started_at)}, {sql_quote(finished_at)}, {rows_written}, "
    f"{sql_quote(message)}, {sql_quote(github_log_url())}, "
    f"{sql_quote(json.dumps(raw or {}, ensure_ascii=False))});"
  )


def clamp(value: float, floor: float = 0, ceiling: float = 100) -> float:
  return min(ceiling, max(floor, value))


def safe_float(value: Any, default: float = 0) -> float:
  try:
    if value is None:
      return default
    numeric = float(value)
    if math.isnan(numeric):
      return default
    return numeric
  except Exception:
    return default


def row_value(row: Any, names: list[str], default: Any = None) -> Any:
  for name in names:
    try:
      value = row.get(name)
      if value is not None and str(value) != "nan":
        return value
    except Exception:
      continue
  return default


def direction_from_score(score: float) -> str:
  if score >= 65:
    return "bullish"
  if score <= 40:
    return "bearish"
  return "neutral"


def outlook_from_score(score: float) -> str:
  if score >= 65:
    return "optimistic"
  if score <= 40:
    return "pessimistic"
  return "neutral"


def json_text(value: Any) -> str:
  return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def stable_id(prefix: str, name: str) -> str:
  digest = hashlib.sha1(name.encode("utf-8")).hexdigest()[:10]
  return f"{prefix}_{digest}"


def factor_state_sql(
  trade_date: str,
  factor_id: str,
  score: float,
  confidence: float,
  summary: str,
  evidence: list[str],
) -> str:
  return (
    "INSERT OR REPLACE INTO factor_states "
    "(trade_date, factor_id, score, direction, outlook, outlook_summary, confidence, evidence_json) "
    f"VALUES ({sql_quote(trade_date)}, {sql_quote(factor_id)}, {score:.2f}, "
    f"{sql_quote(direction_from_score(score))}, {sql_quote(outlook_from_score(score))}, "
    f"{sql_quote(summary)}, {confidence:.2f}, {sql_quote(json_text(evidence))});"
  )


def baseline_state_sql(
  trade_date: str,
  horizon: str,
  narrative: str,
  direction: str,
  stance: str,
  confidence: float,
  anchor_assets: list[str],
  core_sectors: list[str],
  invalidation: list[str],
  evidence: list[str],
  connection_score: float,
  emotion_temperature: float,
  volatility_mode: str,
) -> str:
  return (
    "INSERT OR REPLACE INTO baseline_states "
    "(trade_date, horizon, narrative, direction, stance, confidence, anchor_assets_json, "
    "core_sectors_json, invalidation_json, evidence_json, connection_score, emotion_temperature, volatility_mode) "
    f"VALUES ({sql_quote(trade_date)}, {sql_quote(horizon)}, {sql_quote(narrative)}, "
    f"{sql_quote(direction)}, {sql_quote(stance)}, {confidence:.2f}, "
    f"{sql_quote(json_text(anchor_assets))}, {sql_quote(json_text(core_sectors))}, "
    f"{sql_quote(json_text(invalidation))}, {sql_quote(json_text(evidence))}, "
    f"{connection_score:.2f}, {emotion_temperature:.2f}, {sql_quote(volatility_mode)});"
  )


def quadrant_item_sql(trade_date: str, item: dict[str, Any]) -> str:
  return (
    "INSERT OR REPLACE INTO quadrant_items "
    "(trade_date, symbol, name, asset_type, theme, institution_consensus, fundamental_evidence, "
    "hot_money, narrative_strength, trend_score, entropy_score, liquidity_score, evidence_json) "
    f"VALUES ({sql_quote(trade_date)}, {sql_quote(item['symbol'])}, {sql_quote(item['name'])}, "
    f"{sql_quote(item['asset_type'])}, {sql_quote(item['theme'])}, "
    f"{item['institution_consensus']:.2f}, {item['fundamental_evidence']:.2f}, "
    f"{item['hot_money']:.2f}, {item['narrative_strength']:.2f}, {item['trend_score']:.2f}, "
    f"{item['entropy_score']:.2f}, {item['liquidity_score']:.2f}, "
    f"{sql_quote(json_text(item['evidence']))});"
  )


def theme_sql(theme_id: str, name: str, description: str, role: str) -> str:
  return (
    "INSERT OR REPLACE INTO themes (id, name, description, medium_baseline_role) "
    f"VALUES ({sql_quote(theme_id)}, {sql_quote(name)}, {sql_quote(description)}, {sql_quote(role)});"
  )


def narrative_event_sql(trade_date: str, theme_id: str, title: str, impact_score: float, evidence: list[str]) -> str:
  return (
    "INSERT INTO narrative_events (trade_date, theme_id, title, source, impact_score, evidence) "
    f"VALUES ({sql_quote(trade_date)}, {sql_quote(theme_id)}, {sql_quote(title)}, 'auto_etl', "
    f"{impact_score:.2f}, {sql_quote(json_text(evidence))});"
  )


def macro_observation_sql(trade_date: str, indicator: str, value: float, direction: str, evidence: str) -> str:
  return (
    "INSERT OR REPLACE INTO macro_observations (trade_date, indicator, value, unit, direction, source, evidence) "
    f"VALUES ({sql_quote(trade_date)}, {sql_quote(indicator)}, {value:.4f}, NULL, "
    f"{sql_quote(direction)}, 'akshare', {sql_quote(evidence)});"
  )


def extract_latest_numeric(frame: Any) -> tuple[float | None, float | None]:
  if frame is None or getattr(frame, "empty", True):
    return None, None
  numeric_columns = []
  for column in getattr(frame, "columns", []):
    series = frame[column]
    try:
      converted = series.astype(float)
      if converted.notna().sum() >= 1:
        numeric_columns.append(column)
    except Exception:
      continue
  if not numeric_columns:
    return None, None
  values = frame[numeric_columns[-1]].dropna().astype(float)
  if values.empty:
    return None, None
  latest = float(values.iloc[-1])
  previous = float(values.iloc[-2]) if len(values) > 1 else latest
  return latest, previous


def fetch_macro_observations(ak: Any, trade_date: str) -> tuple[list[str], list[dict[str, Any]]]:
  observations: list[dict[str, Any]] = []
  statements: list[str] = []
  macro_functions = [
    ("PMI", "macro_china_pmi_yearly"),
    ("CPI", "macro_china_cpi_yearly"),
    ("PPI", "macro_china_ppi_yearly"),
    ("社融", "macro_china_shrzgm"),
  ]
  for indicator, function_name in macro_functions:
    try:
      function = getattr(ak, function_name)
      latest, previous = extract_latest_numeric(function())
      if latest is None:
        continue
      delta = latest - (previous or latest)
      direction = "positive" if delta > 0 else "negative" if delta < 0 else "neutral"
      evidence = f"{indicator} 最新值 {latest:.2f}，较上一期变化 {delta:.2f}。"
      observations.append({"indicator": indicator, "latest": latest, "delta": delta, "direction": direction})
      statements.append(macro_observation_sql(trade_date, indicator, latest, direction, evidence))
    except Exception:
      continue
  return statements, observations


def build_board_candidates(ak: Any) -> list[dict[str, Any]]:
  candidates: list[dict[str, Any]] = []
  board_sources = [
    ("industry", "行业板块", "stock_board_industry_name_em"),
    ("concept", "概念板块", "stock_board_concept_name_em"),
  ]
  for board_kind, board_label, function_name in board_sources:
    try:
      frame = getattr(ak, function_name)()
    except Exception:
      continue
    if getattr(frame, "empty", True):
      continue
    for _, row in frame.iterrows():
      name = str(row_value(row, ["板块名称", "行业名称", "概念名称", "名称"], "")).strip()
      if not name:
        continue
      pct = safe_float(row_value(row, ["涨跌幅", "涨跌幅%", "涨幅"], 0))
      turnover = safe_float(row_value(row, ["换手率", "换手率%", "换手"], 0))
      advancers = safe_float(row_value(row, ["上涨家数", "上涨数"], 0))
      decliners = safe_float(row_value(row, ["下跌家数", "下跌数"], 0))
      total = max(advancers + decliners, 1)
      advancer_ratio = advancers / total
      leader = str(row_value(row, ["领涨股票", "领涨股"], "") or "")
      amount = safe_float(row_value(row, ["成交额", "总成交额"], 0))
      strength_score = clamp(50 + pct * 7 + (advancer_ratio - 0.5) * 34)
      heat_score = clamp(45 + pct * 6 + turnover * 2.2 + (advancer_ratio - 0.5) * 20)
      liquidity_score = clamp(45 + math.log10(max(amount, 1)) * 4 if amount else 50 + turnover * 1.6)
      candidates.append(
        {
          "name": name,
          "kind": board_kind,
          "label": board_label,
          "pct": pct,
          "turnover": turnover,
          "advancers": advancers,
          "decliners": decliners,
          "advancer_ratio": advancer_ratio,
          "leader": leader,
          "strength_score": strength_score,
          "heat_score": heat_score,
          "liquidity_score": liquidity_score,
          "raw": row.to_json(force_ascii=False),
        }
      )
  return sorted(candidates, key=lambda item: (item["strength_score"], item["heat_score"]), reverse=True)


def anchor_trend(anchor_rows: dict[str, dict[str, Any]], symbols: list[str]) -> float:
  values = [safe_float(anchor_rows[symbol]["trend_score"], 50) for symbol in symbols if symbol in anchor_rows]
  return sum(values) / len(values) if values else 50


def derive_model_state(
  trade_date: str,
  breadth: dict[str, float] | None,
  anchor_rows: dict[str, dict[str, Any]],
  boards: list[dict[str, Any]],
  macro_observations: list[dict[str, Any]],
) -> list[str]:
  statements: list[str] = []
  if not breadth:
    statements.append("-- model derivation skipped: market_breadth unavailable")
    return statements

  top_boards = boards[:12]
  top_names = [item["name"] for item in top_boards[:5]]
  positive_board_ratio = sum(1 for item in boards if item["pct"] > 0) / max(len(boards), 1) if boards else 0
  top_strength = sum(item["strength_score"] for item in top_boards[:5]) / max(len(top_boards[:5]), 1) if top_boards else 50
  top_heat = sum(item["heat_score"] for item in top_boards[:5]) / max(len(top_boards[:5]), 1) if top_boards else 50
  offshore_risk_pressure = anchor_trend(anchor_rows, ["DX-Y.NYB", "^TNX", "USDCNY=X"])
  offshore_relief = 100 - offshore_risk_pressure
  risk_appetite = clamp(
    breadth["sentiment_score"] * 0.28
    + breadth["heat_score"] * 0.26
    + (100 - breadth["volatility_score"]) * 0.22
    + offshore_relief * 0.24
  )
  denominator_score = clamp(risk_appetite)
  denominator_evidence = [
    f"市场情绪 {breadth['sentiment_score']:.1f}，成交热度 {breadth['heat_score']:.1f}，波动压力 {breadth['volatility_score']:.1f}。",
    f"美元/美债/人民币外部压力均值 {offshore_risk_pressure:.1f}，分母端按反向压力折算。",
  ]
  statements.append(
    factor_state_sql(
      trade_date,
      "liquidity_denominator",
      denominator_score,
      0.72 if anchor_rows else 0.58,
      "由市场成交、情绪、波动率和外部利率/汇率锚自动生成。",
      denominator_evidence,
    )
  )

  if macro_observations:
    macro_scores = []
    for observation in macro_observations:
      indicator = observation["indicator"]
      latest = observation["latest"]
      delta = observation["delta"]
      if indicator == "PMI":
        macro_scores.append(clamp(50 + (latest - 50) * 3 + delta * 6))
      elif indicator in {"CPI", "PPI"}:
        macro_scores.append(clamp(50 + delta * 8 - max(0, -latest) * 5))
      else:
        macro_scores.append(clamp(50 + delta * 4))
    macro_score = sum(macro_scores) / len(macro_scores)
    macro_confidence = 0.68
    macro_evidence = [
      f"{item['indicator']} 最新 {item['latest']:.2f}，变化 {item['delta']:.2f}。"
      for item in macro_observations
    ]
    macro_summary = "由 AKShare 宏观慢变量自动生成，数据发布频率较低，日内不强行切换。"
  else:
    macro_score = 50
    macro_confidence = 0.25
    macro_evidence = ["未成功获取 PMI/CPI/PPI/社融等宏观慢变量，本日总量分子保持中性低置信度。"]
    macro_summary = "宏观慢变量缺失，系统不编造总量分子方向。"
  statements.append(
    factor_state_sql(
      trade_date,
      "macro_numerator",
      macro_score,
      macro_confidence,
      macro_summary,
      macro_evidence,
    )
  )

  anchor_support = anchor_trend(anchor_rows, ["HG=F", "ALI=F", "GC=F", "AMAT", "NVDA"])
  structure_score = clamp(top_strength * 0.48 + top_heat * 0.18 + positive_board_ratio * 100 * 0.18 + anchor_support * 0.16)
  structure_confidence = 0.72 if top_boards else 0.35
  if not top_boards:
    structure_summary = "未成功获取行业/概念板块强弱，结构分子保持中性低置信度。"
    structure_evidence = ["AKShare 行业/概念板块数据缺失，无法自动确认景气赛道。"]
  else:
    structure_summary = "由行业/概念板块相对强弱、扩散宽度、成交热度和外部锚自动生成。"
    structure_evidence = [
      f"自动识别强势主题：{'、'.join(top_names)}。",
      f"前五主题强度均值 {top_strength:.1f}，热度均值 {top_heat:.1f}，正收益板块占比 {positive_board_ratio:.1%}。",
      f"商品/港美映射锚均值 {anchor_support:.1f}。",
      "结构分子只代表可验证结构强弱；产业订单/产能证据缺失时需要人工事件继续确认。",
    ]
  statements.append(
    factor_state_sql(
      trade_date,
      "structure_numerator",
      structure_score,
      structure_confidence,
      structure_summary,
      structure_evidence,
    )
  )

  for index, board in enumerate(top_boards):
    theme_id = stable_id("theme", f"{board['kind']}:{board['name']}")
    role = "medium_core" if index < 5 and structure_score >= 60 else "short_trade"
    evidence = [
      f"{board['label']}涨跌幅 {board['pct']:.2f}%，换手率 {board['turnover']:.2f}%。",
      f"上涨家数 {board['advancers']:.0f}，下跌家数 {board['decliners']:.0f}，领涨股票：{board['leader'] or '未知'}。",
      "该主题由 AKShare 板块强弱自动识别，不等同于人工确认的产业景气。",
    ]
    statements.append(theme_sql(theme_id, board["name"], "AKShare 板块强弱自动识别主题。", role))
    statements.append(narrative_event_sql(trade_date, theme_id, f"自动识别强势{board['label']}：{board['name']}", board["strength_score"], evidence))
    item = {
      "symbol": theme_id,
      "name": board["name"],
      "asset_type": "sector" if board["kind"] == "industry" else "theme",
      "theme": board["label"],
      "institution_consensus": clamp(44 + board["strength_score"] * 0.24 + (6 if board["kind"] == "industry" else 0) - board["turnover"] * 0.35),
      "fundamental_evidence": clamp(42 + board["strength_score"] * 0.22 + (8 if board["kind"] == "industry" else 0)),
      "hot_money": clamp(42 + board["pct"] * 7.5 + board["turnover"] * 3 + (8 if board["kind"] == "concept" else 0)),
      "narrative_strength": clamp(45 + board["heat_score"] * 0.45 + (8 if board["kind"] == "concept" else 2)),
      "trend_score": board["strength_score"],
      "entropy_score": clamp(breadth["dispersion_score"] * 0.5 + breadth["volatility_score"] * 0.32 + board["turnover"] * 1.2),
      "liquidity_score": board["liquidity_score"],
      "evidence": evidence,
    }
    statements.append(quadrant_item_sql(trade_date, item))

  medium_core = top_names[:5]
  if structure_score >= 60 and denominator_score >= 45 and medium_core:
    medium_direction = "up"
    medium_stance = "risk_on"
    medium_narrative = " / ".join(medium_core[:3])
  elif denominator_score <= 40 and macro_score <= 45:
    medium_direction = "down"
    medium_stance = "risk_off"
    medium_narrative = "总量压力主导"
  else:
    medium_direction = "flat"
    medium_stance = "balanced"
    medium_narrative = "等待主线确认"
  anchor_assets = [
    row["name"]
    for _, row in sorted(anchor_rows.items(), key=lambda pair: safe_float(pair[1].get("trend_score"), 50), reverse=True)
    if safe_float(row.get("trend_score"), 50) >= 55
  ][:5]
  medium_confidence = clamp(structure_score * 0.48 + denominator_score * 0.28 + macro_score * 0.24)
  medium_evidence = [
    f"三因子：分母 {denominator_score:.1f}，总量分子 {macro_score:.1f}，结构分子 {structure_score:.1f}。",
    f"核心自动主题：{'、'.join(medium_core) if medium_core else '暂无'}。",
    "中期基线由三因子和结构主题自动生成；人工叙事可以在后台覆盖或补充证据。",
  ]
  statements.append(
    baseline_state_sql(
      trade_date,
      "medium",
      medium_narrative,
      medium_direction,
      medium_stance,
      medium_confidence,
      anchor_assets,
      medium_core,
      ["核心主题跌出强势前列", "结构分子低于 55", "总量分母跌破 40"],
      medium_evidence,
      medium_confidence,
      breadth["sentiment_score"],
      "normal" if breadth["volatility_score"] < 62 else "expanded",
    )
  )

  hot_boards = sorted(top_boards, key=lambda item: item["heat_score"], reverse=True)[:5]
  hot_names = [item["name"] for item in hot_boards]
  overlap = len(set(hot_names[:3]) & set(medium_core[:5]))
  connection_score = clamp(45 + overlap * 14 + max(0, structure_score - 55) * 0.35)
  short_direction = "up" if breadth["sentiment_score"] >= 58 and hot_names else "flat"
  short_stance = "risk_on" if connection_score >= 65 and denominator_score >= 45 else "balanced"
  volatility_mode = "expanded" if breadth["volatility_score"] >= 62 or breadth["dispersion_score"] >= 66 else "normal"
  short_evidence = [
    f"短期热度主题：{'、'.join(hot_names) if hot_names else '暂无'}。",
    f"短期主题与中期核心重合数 {overlap}，连接度 {connection_score:.1f}。",
    f"情绪 {breadth['sentiment_score']:.1f}，波动 {breadth['volatility_score']:.1f}，离散度 {breadth['dispersion_score']:.1f}。",
  ]
  statements.append(
    baseline_state_sql(
      trade_date,
      "short",
      " / ".join(hot_names[:3]) if hot_names else "等待短期故事",
      short_direction,
      short_stance,
      clamp(breadth["sentiment_score"] * 0.42 + top_heat * 0.34 + connection_score * 0.24),
      hot_names,
      hot_names,
      ["高热主题跌出强势前列", "连接度低于 45", "市场宽度快速转弱"],
      short_evidence,
      connection_score,
      breadth["sentiment_score"],
      volatility_mode,
    )
  )

  statements.append(
    collection_run_sql(
      "model_derivation",
      "success",
      utc_now(),
      utc_now(),
      3 + 2 + len(top_boards),
      f"自动生成三因子 3 条、基线 2 条、象限候选 {len(top_boards)} 条。",
      {
        "top_themes": top_names,
        "denominator_score": round(denominator_score, 2),
        "macro_score": round(macro_score, 2),
        "structure_score": round(structure_score, 2),
      },
    )
  )
  return statements


def main() -> int:
  try:
    import akshare as ak
    import pandas as pd
    import yfinance as yf
  except Exception as exc:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
      "-- Missing Python market data dependency. Install requirements.txt before running.\n"
      f"-- Error: {exc}\n",
      encoding="utf-8",
    )
    return 0

  today = dt.date.today().isoformat()
  statements: list[str] = []
  breadth_state: dict[str, float] | None = None
  anchor_rows: dict[str, dict[str, Any]] = {}
  macro_observations: list[dict[str, Any]] = []
  board_candidates: list[dict[str, Any]] = []

  akshare_started = utc_now()
  try:
    spot = ak.stock_zh_a_spot_em()
    advancers = int((spot["涨跌幅"] > 0).sum())
    decliners = int((spot["涨跌幅"] < 0).sum())
    limit_up = int((spot["涨跌幅"] >= 9.8).sum())
    limit_down = int((spot["涨跌幅"] <= -9.8).sum())
    turnover_cny_bn = float(spot["成交额"].fillna(0).sum()) / 100_000_000
    volatility_score = min(100, max(0, float(spot["涨跌幅"].std()) * 12))
    dispersion_score = min(100, max(0, float(spot["涨跌幅"].abs().mean()) * 14))
    sentiment_score = min(100, max(0, 50 + (advancers - decliners) / max(len(spot), 1) * 55 + limit_up * 0.12))
    heat_score = min(100, max(0, 45 + turnover_cny_bn / 45 + limit_up * 0.1))
    premium_discount_score = min(100, max(0, 45 + sentiment_score * 0.35 + heat_score * 0.2 - volatility_score * 0.15))
    breadth_state = {
      "advancers": advancers,
      "decliners": decliners,
      "limit_up": limit_up,
      "limit_down": limit_down,
      "turnover_cny_bn": turnover_cny_bn,
      "volatility_score": volatility_score,
      "dispersion_score": dispersion_score,
      "sentiment_score": sentiment_score,
      "premium_discount_score": premium_discount_score,
      "heat_score": heat_score,
    }

    statements.append(
      "INSERT OR REPLACE INTO market_breadth "
      "(trade_date, advancers, decliners, limit_up, limit_down, turnover_cny_bn, "
      "volatility_score, dispersion_score, sentiment_score, premium_discount_score, heat_score, raw_json) "
      f"VALUES ({sql_quote(today)}, {advancers}, {decliners}, {limit_up}, {limit_down}, "
      f"{turnover_cny_bn:.2f}, {volatility_score:.2f}, {dispersion_score:.2f}, "
      f"{sentiment_score:.2f}, {premium_discount_score:.2f}, {heat_score:.2f}, "
      f"{sql_quote(json.dumps({'rows': len(spot)}, ensure_ascii=False))});"
    )

    rows_written = 1
    for _, row in spot.head(400).iterrows():
      statements.append(
        "INSERT OR REPLACE INTO market_prices "
        "(trade_date, symbol, name, market, asset_type, close, change_pct, turnover, volume, source, raw_json) "
        f"VALUES ({sql_quote(today)}, {sql_quote(row.get('代码'))}, {sql_quote(row.get('名称'))}, "
        f"'CN', 'stock', {float(row.get('最新价') or 0):.4f}, {float(row.get('涨跌幅') or 0):.4f}, "
        f"{float(row.get('成交额') or 0):.2f}, {float(row.get('成交量') or 0):.2f}, 'akshare', "
        f"{sql_quote(row.to_json(force_ascii=False))});"
      )
      rows_written += 1
    statements.append(
      collection_run_sql(
        "akshare_a_spot",
        "success",
        akshare_started,
        utc_now(),
        rows_written,
        f"写入 market_breadth 1 行、market_prices {rows_written - 1} 行。",
        {"source_rows": len(spot)},
      )
    )
  except Exception as exc:
    message = f"AKShare A-share fetch failed: {str(exc).replace(chr(10), ' ')}"
    statements.append(f"-- {message}")
    statements.append(collection_run_sql("akshare_a_spot", "failed", akshare_started, utc_now(), 0, message))

  macro_started = utc_now()
  try:
    macro_statements, macro_observations = fetch_macro_observations(ak, today)
    statements.extend(macro_statements)
    statements.append(
      collection_run_sql(
        "akshare_macro",
        "success" if macro_observations else "skipped",
        macro_started,
        utc_now(),
        len(macro_observations),
        f"写入宏观慢变量 {len(macro_observations)} 条。" if macro_observations else "未获取到可用宏观慢变量，模型将以低置信度中性处理总量分子。",
        {"indicators": [item["indicator"] for item in macro_observations]},
      )
    )
  except Exception as exc:
    message = f"AKShare macro fetch failed: {str(exc).replace(chr(10), ' ')}"
    statements.append(f"-- {message}")
    statements.append(collection_run_sql("akshare_macro", "failed", macro_started, utc_now(), 0, message))

  boards_started = utc_now()
  try:
    board_candidates = build_board_candidates(ak)
    statements.append(
      collection_run_sql(
        "akshare_boards",
        "success" if board_candidates else "skipped",
        boards_started,
        utc_now(),
        len(board_candidates),
        f"读取行业/概念板块 {len(board_candidates)} 条，用于结构分子、基线和四象限派生。"
        if board_candidates
        else "未获取到行业/概念板块，结构分子将低置信度处理。",
        {"top": [item["name"] for item in board_candidates[:10]]},
      )
    )
  except Exception as exc:
    message = f"AKShare board fetch failed: {str(exc).replace(chr(10), ' ')}"
    statements.append(f"-- {message}")
    statements.append(collection_run_sql("akshare_boards", "failed", boards_started, utc_now(), 0, message))

  anchors = {
    "HG=F": ("铜", "commodity"),
    "ALI=F": ("铝", "commodity"),
    "GC=F": ("黄金", "commodity"),
    "CL=F": ("原油", "commodity"),
    "DX-Y.NYB": ("美元指数", "macro"),
    "^TNX": ("美国10年期国债收益率", "macro"),
    "USDCNY=X": ("美元兑人民币", "macro")
  }

  yfinance_started = utc_now()
  try:
    yfinance_rows = 0
    for symbol, (name, anchor_type) in anchors.items():
      data = yf.download(symbol, period="1mo", progress=False, auto_adjust=True)
      if data.empty:
        continue
      close_series = data["Close"]
      if hasattr(close_series, "columns"):
        close_series = close_series.iloc[:, 0]
      close = float(close_series.iloc[-1])
      previous = float(close_series.iloc[-2]) if len(close_series) > 1 else close
      change_pct = (close / previous - 1) * 100 if previous else 0
      ma5 = float(close_series.tail(5).mean())
      ma20 = float(close_series.tail(min(20, len(close_series))).mean())
      trend_score = min(100, max(0, 50 + (close / ma20 - 1) * 420 + (ma5 / ma20 - 1) * 260))
      anchor_rows[symbol] = {
        "name": name,
        "anchor_type": anchor_type,
        "close": close,
        "change_pct": change_pct,
        "trend_score": trend_score,
      }
      statements.append(
        "INSERT OR REPLACE INTO anchor_assets "
        "(trade_date, symbol, name, anchor_type, close, change_pct, trend_score, evidence, source, raw_json) "
        f"VALUES ({sql_quote(today)}, {sql_quote(symbol)}, {sql_quote(name)}, {sql_quote(anchor_type)}, "
        f"{close:.4f}, {change_pct:.4f}, {trend_score:.2f}, "
        f"{sql_quote('1mo trend score generated from yfinance close series')}, 'yfinance', "
        f"{sql_quote(json.dumps({'rows': len(data)}, ensure_ascii=False))});"
      )
      yfinance_rows += 1
    statements.append(
      collection_run_sql(
        "yfinance_anchors",
        "success",
        yfinance_started,
        utc_now(),
        yfinance_rows,
        f"写入 {yfinance_rows} 个外部锚资产。",
        {"tickers": list(anchors.keys())},
      )
    )
  except Exception as exc:
    message = f"yfinance anchor fetch failed: {str(exc).replace(chr(10), ' ')}"
    statements.append(f"-- {message}")
    statements.append(collection_run_sql("yfinance_anchors", "failed", yfinance_started, utc_now(), 0, message))

  model_started = utc_now()
  try:
    statements.extend(derive_model_state(today, breadth_state, anchor_rows, board_candidates, macro_observations))
  except Exception as exc:
    message = f"model derivation failed: {str(exc).replace(chr(10), ' ')}"
    statements.append(f"-- {message}")
    statements.append(collection_run_sql("model_derivation", "failed", model_started, utc_now(), 0, message))

  OUT.parent.mkdir(parents=True, exist_ok=True)
  OUT.write_text("\n".join(statements) + "\n", encoding="utf-8")
  print(f"Wrote {OUT}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
