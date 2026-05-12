# TeamHub 项目经验记录

## LRN-20260509-001: TipTap useEditor content 非响应式问题

**问题**: TipTap 的 `useEditor({ content })` 只在初始化时读取 content，后续外部 state 更新不会同步到编辑器内部。在编辑公告时，加载已有内容后编辑器显示空白。

**根因**: `useEditor` 的 `content` 参数不是响应式的。

**修复**: 使用 `useEffect` 监听 `content` prop，调用 `editor.commands.setContent(content, { emitUpdate: false })`。注意 `setContent` 的第二个参数是 `SetContentOptions`，不是 boolean。

```tsx
useEffect(() => {
  if (editor && content !== editor.getHTML()) {
    editor.commands.setContent(content, { emitUpdate: false });
  }
}, [editor, content]);
```

**教训**: TipTap 编辑器的内容同步需要显式处理，不能依赖 hooks 的响应式。

---

## LRN-20260509-002: 动态系统配置实现

**需求**: 后端支持任意 key-value 配置，前端 Settings 页面支持 admin 动态添加/编辑/删除。

**后端设计**:
- `SystemSetting` 表：key (unique), value (JSON)
- `GET /api/settings`: 返回所有配置 + fallback 默认值
- `POST /api/settings/keys`: 创建/更新单个配置
- `DELETE /api/settings/keys/{key}`: 删除配置

**前端设计**:
- Settings.tsx 新增 `system` Tab，仅 admin 可见
- 列表展示所有配置项，支持内联编辑、删除
- 顶部添加新配置表单

**教训**: 动态配置不要用白名单限制 keys，否则每次新增配置都要改代码。

---

## LRN-20260509-003: 公告可见性权限控制

**需求**: 公告支持 `public`（所有人可见）和 `manager_only`（仅主理人可见）。

**实现**:
- 数据库: `announcements.visibility` 字段，默认 `public`
- 后端: `list_announcements` 自动过滤，非 admin/manager 只能看到 `public`
- 前端: 编辑页面显示可见性选择器，仅 manager/admin 可操作

**教训**: 权限过滤在后端做，前端只做 UI 层面的控制。不能信任前端传来的数据。

---

## LRN-20260509-004: Windows PowerShell 编码问题

**问题**: PowerShell 执行某些命令时出现 GBK 编码乱码。

**解决方案**: 用 Python 脚本替代 PowerShell 处理复杂文本操作，避免编码问题。

---

## LRN-20260509-005: Alembic 执行方式

**问题**: `python -c "import alembic; ..."` 在 Windows venv 中可能找不到模块。

**解决方案**: 使用 `python -m alembic` 执行迁移命令，确保使用正确的 Python 环境。

---

## LRN-20260509-006: 前端构建前必须运行 tsc

**教训**: `npm run build` 会运行 `tsc -b`，所以构建前必须先修复所有 TS 错误。本次发现的未使用变量和类型错误都应在提交前解决。
