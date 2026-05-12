"""
权限计算引擎 - 基于角色矩阵 + 个人覆盖的并集计算
"""
from database import User, get_setting
from permission_defs import MODULES
from sqlalchemy.orm import Session


def get_user_permissions(db: Session, user: User) -> set[str]:
    """返回用户在角色矩阵权限 ∪ 个人覆盖权限的并集

    例如：角色"内容编辑"无"documents.delete"，但单独授予了用户该权限
          → 最终权限集包含 documents.delete
    """
    matrix = get_setting(db, "permission_matrix", {})
    role_perms = set()

    # 1. 从权限矩阵展开角色权限
    for perm_string in matrix.get(user.role, []):
        if perm_string.endswith(".*"):
            module = perm_string[:-2]
            if module in MODULES:
                for action in MODULES[module]["actions"]:
                    role_perms.add(f"{module}.{action}")
        else:
            role_perms.add(perm_string)

    # 2. 个人特殊授权覆盖（并集）
    overrides = user.permissions or {}
    for perm_key, enabled in overrides.items():
        if enabled:
            role_perms.add(perm_key)
        else:
            role_perms.discard(perm_key)  # 显式拒绝覆盖

    return role_perms


def has_permission(db: Session, user: User, module: str, action: str) -> bool:
    """检查用户是否有特定模块+操作权限"""
    full_perm = f"{module}.{action}"
    perms = get_user_permissions(db, user)
    return full_perm in perms


def get_allowed_modules(db: Session, user: User) -> dict[str, list[str]]:
    """返回 {module_key: [allowed_actions]} 供前端菜单过滤"""
    perms = get_user_permissions(db, user)
    result = {}
    for module_key, module_def in MODULES.items():
        actions = []
        for action in module_def["actions"]:
            if f"{module_key}.{action}" in perms:
                actions.append(action)
        if actions:
            result[module_key] = actions
    return result
