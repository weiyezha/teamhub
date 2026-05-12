import sys
import os

os.chdir(r'C:\Users\le\projects\teamhub\backend')
sys.path.insert(0, r'C:\Users\le\projects\teamhub\backend')

from database import get_db, get_setting, set_setting

db = next(get_db())

matrix = get_setting(db, "permission_matrix", {})
print(f"Current matrix: {matrix}")

# Add new modules with sensible defaults
for role in matrix:
    role_perms = set(matrix[role])
    
    # Add tasks permissions
    if role == 'admin':
        role_perms.add('tasks.*')
        role_perms.add('team.*')
        role_perms.add('settings.*')
    elif role == 'manager':
        role_perms.add('tasks.view')
        role_perms.add('team.view')
        role_perms.add('settings.view')
    elif role == 'member':
        role_perms.add('tasks.view')
        role_perms.add('team.view')
        role_perms.add('settings.view')
    elif role == 'guest':
        role_perms.add('settings.view')
    
    matrix[role] = sorted(role_perms)

print(f"Updated matrix: {matrix}")
set_setting(db, "permission_matrix", matrix)
print("Saved to database!")
