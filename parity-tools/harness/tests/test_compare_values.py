"""Tests for compare.compare_values (Task 12)"""
import sys
from pathlib import Path

# Import harness module; path setup so tests work from any cwd.
_HARNESS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_HARNESS))

from compare import compare_values, DEFAULT_TOLERANCE  # noqa: E402


def test_equal_ints_match():
    diff = compare_values(5, 5, DEFAULT_TOLERANCE)
    assert diff is None


def test_unequal_ints_diverge():
    diff = compare_values(5, 6, DEFAULT_TOLERANCE)
    assert diff is not None
    assert diff["python"] == 5
    assert diff["typescript"] == 6


def test_floats_within_tolerance_match():
    tol = {"float_abs": 1e-6, "float_rel": 1e-9}
    assert compare_values(1.0, 1.0000001, tol) is None


def test_floats_outside_tolerance_diverge():
    tol = {"float_abs": 1e-9, "float_rel": 1e-12}
    diff = compare_values(1.0, 1.01, tol)
    assert diff is not None


def test_nan_matches_nan():
    assert compare_values(float("nan"), "NaN", DEFAULT_TOLERANCE) is None


def test_none_null_undefined_equal():
    assert compare_values(None, None, DEFAULT_TOLERANCE) is None


def test_list_divergence_reports_index():
    diff = compare_values([1, 2, 3], [1, 99, 3], DEFAULT_TOLERANCE)
    assert diff is not None
    assert "[1]" in diff["path"]


def test_dict_divergence_reports_key():
    diff = compare_values({"a": 1, "b": 2}, {"a": 1, "b": 999}, DEFAULT_TOLERANCE)
    assert diff is not None
    assert "b" in diff["path"]


def test_none_vs_value_is_type_mismatch():
    diff = compare_values(None, 5, DEFAULT_TOLERANCE)
    assert diff is not None
    assert diff["rule"] == "type_mismatch"


def test_bool_true_equals_int_one():
    # Spec-settled: Python True == 1, so True vs 1 matches.
    assert compare_values(True, 1, DEFAULT_TOLERANCE) is None


def test_bool_true_vs_int_two_diverges():
    assert compare_values(True, 2, DEFAULT_TOLERANCE) is not None


def test_string_exact_match():
    assert compare_values("abc", "abc", DEFAULT_TOLERANCE) is None
    assert compare_values("abc ", "abc", DEFAULT_TOLERANCE) is None  # strip behaviour
    assert compare_values("abc", "abd", DEFAULT_TOLERANCE) is not None
