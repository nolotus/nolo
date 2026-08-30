#!/usr/bin/env python3
"""Strip NOLO_CI_DIAG_TOKEN from pm2 dump files (dump.pm2 / dump.pm2.bak).

pm2 save 序列化的 dump 结构是 [{"pm2_env": {..., "env": {...}}, "name": ...}]：
diag token 可能出现在
  - app.pm2_env.env        （环境变量子对象，常见位置）
  - app.pm2_env 顶层        （pm2 某些版本把 start env 扁平化写入 pm2_env）
  - app.env                （旧版本/兜底形态）
三处一并剥离：token 只需存在于运行进程 env（部署探针用完即弃），
机器重启 resurrect 时不应把旧 token 带回进程 env。

用法：python3 sanitize_pm2_dump_diag_token.py [PM2_HOME]
PM2_HOME 缺省取环境变量。文件缺失跳过；任何失败仅 WARN 退出 0（不阻断部署）。
"""

import json
import os
import sys

TOKEN_KEY = "NOLO_CI_DIAG_TOKEN"


def strip_from_app(app) -> bool:
    if not isinstance(app, dict):
        return False
    changed = False
    if app.pop(TOKEN_KEY, None) is not None:  # app 顶层（兜底形态）
        changed = True
    pm2_env = app.get("pm2_env")
    if isinstance(pm2_env, dict):
        if pm2_env.pop(TOKEN_KEY, None) is not None:  # pm2_env 顶层键
            changed = True
        env = pm2_env.get("env")
        if isinstance(env, dict) and env.pop(TOKEN_KEY, None) is not None:  # env 子对象
            changed = True
    env = app.get("env")
    if isinstance(env, dict) and env.pop(TOKEN_KEY, None) is not None:
        changed = True
    return changed


def sanitize_file(path: str) -> str:
    if not os.path.isfile(path):
        return "missing"
    try:
        with open(path, "r", encoding="utf-8") as f:
            apps = json.load(f)
    except Exception as exc:
        print(f"WARN: sanitize {path}: read failed: {exc}", file=sys.stderr)
        return "warn"
    if not isinstance(apps, list):
        print(f"WARN: sanitize {path}: unexpected dump shape, skipping", file=sys.stderr)
        return "warn"
    if not any(strip_from_app(app) for app in apps):
        return "clean"
    tmp_path = f"{path}.tmp"
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(apps, f)
        os.replace(tmp_path, path)
        return "stripped"
    except Exception as exc:
        print(f"WARN: sanitize {path}: write failed: {exc}", file=sys.stderr)
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        return "warn"


def main() -> int:
    pm2_home = ""
    if len(sys.argv) > 1 and sys.argv[1]:
        pm2_home = sys.argv[1]
    else:
        pm2_home = os.environ.get("PM2_HOME", "")
    if not pm2_home:
        print("WARN: sanitize: PM2_HOME not set, skipping", file=sys.stderr)
        return 0
    for name in ("dump.pm2", "dump.pm2.bak"):
        result = sanitize_file(os.path.join(pm2_home, name))
        if result == "stripped":
            print(f"🔑 stripped {TOKEN_KEY} from {name} (survives pm2 save, not resurrect)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
