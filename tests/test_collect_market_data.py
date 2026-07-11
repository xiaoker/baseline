import importlib.util
import pathlib
import unittest
from unittest.mock import patch

import pandas as pd


SCRIPT_PATH = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "collect_market_data.py"
SPEC = importlib.util.spec_from_file_location("collect_market_data", SCRIPT_PATH)
assert SPEC and SPEC.loader
collect_market_data = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(collect_market_data)


class FakeResponse:
  def __init__(self, payload):
    self.payload = payload

  def raise_for_status(self):
    return None

  def json(self):
    return self.payload


class FakeTencentRequests:
  def __init__(self, total=3200):
    self.total = total
    self.offsets = []

  def get(self, _url, params, headers, timeout):
    self.offsets.append(int(params["offset"]))
    self.assert_request_shape(headers, timeout)
    offset = int(params["offset"])
    count = int(params["count"])
    rows = []
    for index in range(offset, min(offset + count, self.total)):
      rows.append(
        {
          "code": f"sh{600000 + index:06d}",
          "name": f"测试股票{index}",
          "zxj": "10.50",
          "zdf": "2.50",
          "zd": "0.26",
          "volume": "100",
          "turnover": "12.34",
          "zf": "3.20",
          "hsl": "1.50",
          "pe_ttm": "20.00",
          "pn": "2.00",
          "lb": "1.10",
          "zsz": "50.00",
          "ltsz": "40.00",
          "speed": "0.20",
          "zdf_d60": "8.00",
          "zdf_y": "6.00",
        }
      )
    return FakeResponse({"code": 0, "msg": "ok", "data": {"rank_list": rows, "offset": offset, "total": self.total}})

  def assert_request_shape(self, headers, timeout):
    assert headers["Referer"].startswith("https://stockapp.finance.qq.com/")
    assert timeout == 15


class TencentSpotCollectionTest(unittest.TestCase):
  def test_fetches_all_pages_and_normalizes_units(self):
    requests = FakeTencentRequests()

    frame = collect_market_data.fetch_tencent_a_spot(pd, requests)

    self.assertEqual(len(frame), 3200)
    self.assertEqual(requests.offsets, list(range(0, 3200, 200)))
    self.assertEqual(frame.iloc[0]["代码"], "600000")
    self.assertEqual(frame.iloc[0]["名称"], "测试股票0")
    self.assertAlmostEqual(frame.iloc[0]["成交额"], 123400.0)
    self.assertAlmostEqual(frame.iloc[0]["总市值"], 5_000_000_000.0)
    self.assertAlmostEqual(frame.iloc[0]["流通市值"], 4_000_000_000.0)

  def test_rejects_incomplete_market_coverage(self):
    requests = FakeTencentRequests(total=200)

    with self.assertRaisesRegex(RuntimeError, "coverage incomplete"):
      collect_market_data.fetch_tencent_a_spot(pd, requests)

  def test_maps_provider_to_persisted_source(self):
    self.assertEqual(collect_market_data.market_price_source("tencent_direct"), "tencent")
    self.assertEqual(collect_market_data.market_price_source("eastmoney_direct"), "eastmoney")
    self.assertEqual(collect_market_data.market_price_source("akshare_stock_zh_a_spot_em"), "akshare")


class ThsBoardCollectionTest(unittest.TestCase):
  def test_normalizes_ths_industry_units_and_fields(self):
    source = pd.DataFrame(
      [
        {
          "板块": "半导体",
          "涨跌幅(%)": "2.50",
          "总成交额（亿元）": "18.60",
          "上涨家数": "42",
          "下跌家数": "8",
          "领涨股": "测试股份",
          "涨跌幅(%).1": "10.00",
        }
      ]
    )

    frame = collect_market_data.normalize_ths_industry_frame(pd, source)

    self.assertEqual(frame.iloc[0]["板块名称"], "半导体")
    self.assertAlmostEqual(frame.iloc[0]["成交额"], 1_860_000_000.0, places=1)
    self.assertEqual(frame.iloc[0]["上涨家数"], "42")
    self.assertEqual(frame.iloc[0]["领涨股票"], "测试股份")

  def test_normalizes_ths_concept_snapshot(self):
    frame = collect_market_data.normalize_ths_concept_frame(
      pd,
      [{"platename": "人形机器人", "cid": "309119", "199112": "3.20", "zjjlr": "8.50", "zfl": "76"}],
    )

    self.assertEqual(frame.iloc[0]["板块名称"], "人形机器人")
    self.assertEqual(frame.iloc[0]["板块代码"], "309119")
    self.assertAlmostEqual(frame.iloc[0]["涨跌幅"], 3.2)
    self.assertAlmostEqual(frame.iloc[0]["净流入（亿元）"], 8.5)

  def test_uses_ths_after_eastmoney_failure(self):
    fallback = pd.DataFrame([{"板块名称": "半导体", "涨跌幅": 2.5}])

    with patch.object(collect_market_data, "fetch_eastmoney_board_frame", side_effect=RuntimeError("empty reply")):
      with patch.object(collect_market_data, "fetch_ths_board_frame", return_value=fallback):
        frame, provider = collect_market_data.fetch_board_frame(None, pd, "industry", "unused")

    self.assertEqual(provider, "ths_direct_industry")
    self.assertEqual(frame.iloc[0]["板块名称"], "半导体")

  def test_missing_concept_breadth_is_neutral_not_bearish(self):
    concept = pd.DataFrame([{"板块名称": "人形机器人", "板块代码": "309119", "涨跌幅": 2.0}])

    with patch.object(
      collect_market_data,
      "fetch_board_frame",
      side_effect=[(pd.DataFrame(), "ths_direct_industry"), (concept, "ths_direct_concept")],
    ):
      candidates, diagnostics = collect_market_data.build_board_candidates(None, pd)

    self.assertEqual(diagnostics, ["行业板块: empty dataframe"])
    self.assertEqual(len(candidates), 1)
    self.assertFalse(candidates[0]["breadth_available"])
    self.assertAlmostEqual(candidates[0]["advancer_ratio"], 0.5)
    self.assertAlmostEqual(candidates[0]["strength_score"], 64.0)


if __name__ == "__main__":
  unittest.main()
