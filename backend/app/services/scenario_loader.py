"""
场景加载器。
负责从 JSON 文件读取场景数据，校验结构，返回 Scenario 对象。
"""
import json
from pathlib import Path

from app.models.scenario import Scenario


# scenarios/ 目录固定在 backend/ 下，与 app/ 平级
_SCENARIOS_DIR = Path(__file__).parent.parent.parent / "scenarios"


def load_scenario(scenario_id: str) -> Scenario:
    """
    按 scenario_id 加载场景文件。
    文件名规范：{scenario_id}.json
    若文件不存在或结构不合法，抛出明确异常。
    """
    path = _SCENARIOS_DIR / f"{scenario_id}.json"

    if not path.exists():
        raise FileNotFoundError(
            f"场景文件不存在：{path}。"
            f"请确认 scenarios/ 目录下有 {scenario_id}.json 文件。"
        )

    with path.open(encoding="utf-8") as f:
        raw = json.load(f)

    # Pydantic 校验：字段缺失或类型错误会抛出 ValidationError
    return Scenario.model_validate(raw)


def list_scenarios() -> list[dict]:
    """
    返回所有可用场景的摘要列表（不加载完整数据）。
    仅读取 metadata 字段，供前端场景选择界面使用。
    """
    result = []

    for path in sorted(_SCENARIOS_DIR.glob("*.json")):
        with path.open(encoding="utf-8") as f:
            raw = json.load(f)

        metadata = raw.get("metadata", {})
        result.append(
            {
                "scenario_id": raw.get("scenario_id"),
                "title": metadata.get("title"),
                "description": metadata.get("description"),
                "category": metadata.get("category"),
                "difficulty": metadata.get("difficulty"),
                "estimated_rounds": metadata.get("estimated_rounds"),
            }
        )

    return result