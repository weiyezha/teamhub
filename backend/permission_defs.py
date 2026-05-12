"""
权限模块定义 - 定义系统中所有可控制的模块及操作
"""

MODULES = {
    "announcements": {
        "label": "公告中心",
        "actions": ["view", "publish", "delete"],
    },
    "documents": {
        "label": "文档管理",
        "actions": ["view", "create_edit", "delete"],
    },
    "dashboard": {
        "label": "数据看板",
        "actions": ["view"],
    },
    "tasks": {
        "label": "我的任务",
        "actions": ["view"],
    },
    "team": {
        "label": "团队",
        "actions": ["view"],
    },
    "settings": {
        "label": "设置",
        "actions": ["view"],
    },
}
