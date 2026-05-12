import sys
import os

# 切换到 backend 目录，确保使用正确的数据库
os.chdir(r'C:\Users\le\projects\teamhub\backend')
sys.path.insert(0, r'C:\Users\le\projects\teamhub\backend')

from database import get_db, User, SystemSetting
from permissions import get_user_permissions, has_permission, get_allowed_modules
from permission_defs import MODULES

db = next(get_db())

# 检查 get_setting 的返回值
from database import get_setting
matrix = get_setting(db, "permission_matrix", {})
print(f"get_setting 返回类型: {type(matrix)}")
print(f"get_setting 返回值: {matrix}")

# 检查 system_settings 表中的原始数据
setting = db.query(SystemSetting).filter(SystemSetting.key == 'permission_matrix').first()
if setting:
    print(f"\ns.value 类型: {type(setting.value)}")
    print(f"s.value: {setting.value}")

# 测试所有用户的权限
users = db.query(User).all()
for u in users:
    print(f"\n用户: {u.name} (role={u.role!r})")
    perms = get_user_permissions(db, u)
    print(f"  权限: {perms}")
    has_ann = has_permission(db, u, "announcements", "view")
    print(f"  has announcements.view: {has_ann}")
    allowed = get_allowed_modules(db, u)
    print(f"  allowed_modules: {allowed}")
