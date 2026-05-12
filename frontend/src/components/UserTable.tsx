import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import {
  Check,
  X,
  Pencil,
  Ban,
  UserCheck,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react';

interface AdminUser {
  id: number;
  name: string;
  username: string;
  role: string;
  department: string;
  title: string;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
}

const roleOptions = [
  { value: 'admin', label: '管理员' },
  { value: 'manager', label: '主理人' },
  { value: 'member', label: '商务' },
  { value: 'guest', label: '访客' },
];

const columnHelper = createColumnHelper<AdminUser>();

interface UserTableProps {
  users: AdminUser[];
  onToggleActive: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onSave: (userId: number, form: Partial<AdminUser>) => void;
}

export function UserTable({ users, onToggleActive, onDelete, onSave }: UserTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = [
    columnHelper.accessor('name', {
      header: '用户',
      cell: ({ row, getValue }) => {
        const user = row.original;
        const isEditing = editingId === user.id;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-xs font-medium shrink-0">
              {user.name?.charAt(0) ?? '?'}
            </div>
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  aria-label="用户姓名"
                  className="px-2 py-1 bg-bg-secondary border border-border rounded text-sm text-text-primary outline-none focus:border-accent"
                />
              ) : (
                <>
                  <p className="font-medium text-text-primary">{getValue() || '未知用户'}</p>
                  <p className="text-xs text-text-secondary">{user.username || '-'}</p>
                </>
              )}
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('role', {
      header: '角色',
      cell: ({ row, getValue }) => {
        const user = row.original;
        const isEditing = editingId === user.id;
        if (isEditing) {
          return (
            <select
              value={editForm.role || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
              aria-label="角色"
              className="px-2 py-1 bg-bg-secondary border border-border rounded text-sm text-text-primary outline-none focus:border-accent"
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          );
        }
        const role = getValue();
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded-tag ${
              role === 'admin'
                ? 'bg-accent-bg text-accent'
                : role === 'manager'
                ? 'bg-violet-500/10 text-violet-600'
                : 'bg-bg-secondary text-text-secondary'
            }`}
          >
            {roleOptions.find((r) => r.value === role)?.label || role}
          </span>
        );
      },
    }),
    columnHelper.accessor('department', {
      header: '部门',
      cell: ({ row, getValue }) => {
        const isEditing = editingId === row.original.id;
        if (isEditing) {
          return (
            <input
              type="text"
              value={editForm.department || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
              aria-label="部门"
              className="px-2 py-1 bg-bg-secondary border border-border rounded text-sm text-text-primary outline-none focus:border-accent w-24"
            />
          );
        }
        return <span className="text-text-primary">{getValue() || '-'}</span>;
      },
    }),
    columnHelper.accessor('title', {
      header: '职位',
      cell: ({ row, getValue }) => {
        const isEditing = editingId === row.original.id;
        if (isEditing) {
          return (
            <input
              type="text"
              value={editForm.title || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              aria-label="职位"
              className="px-2 py-1 bg-bg-secondary border border-border rounded text-sm text-text-primary outline-none focus:border-accent w-24"
            />
          );
        }
        return <span className="text-text-primary">{getValue() || '-'}</span>;
      },
    }),
    columnHelper.accessor('is_active', {
      header: '状态',
      cell: ({ getValue }) => {
        const active = getValue();
        return (
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              active ? 'text-success' : 'text-warning'
            }`}
          >
            {active ? <UserCheck size={12} /> : <Ban size={12} />}
            {active ? '正常' : '禁用'}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const user = row.original;
        const isEditing = editingId === user.id;
        if (isEditing) {
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => {
                  onSave(user.id, editForm);
                  setEditingId(null);
                }}
                className="p-1 text-success hover:bg-success/10 rounded transition-colors"
                title="保存"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="p-1 text-text-tertiary hover:bg-bg-secondary rounded transition-colors"
                title="取消"
              >
                <X size={14} />
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => {
                setEditingId(user.id);
                setEditForm({
                  name: user.name,
                  role: user.role,
                  department: user.department,
                  title: user.title,
                  is_active: user.is_active,
                });
              }}
              className="p-1 text-text-secondary hover:text-accent hover:bg-accent-bg rounded transition-colors"
              title="编辑"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onToggleActive(user)}
              className={`p-1 rounded transition-colors ${
                user.is_active
                  ? 'text-text-secondary hover:text-danger hover:bg-danger/10'
                  : 'text-text-secondary hover:text-success hover:bg-success/10'
              }`}
              title={user.is_active ? '禁用' : '启用'}
            >
              {user.is_active ? <Ban size={14} /> : <UserCheck size={14} />}
            </button>
            <button
              onClick={() => onDelete(user)}
              className="p-1 text-text-secondary hover:text-danger hover:bg-danger/10 rounded transition-colors"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="搜索用户..."
          aria-label="搜索用户"
          className="w-full md:w-72 pl-9 pr-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-bg-secondary/50 text-text-secondary">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="text-left px-4 py-3 font-medium cursor-pointer select-none"
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === 'asc' && <ArrowUp size={12} />}
                      {h.column.getIsSorted() === 'desc' && <ArrowDown size={12} />}
                      {!h.column.getIsSorted() && h.column.getCanSort() && <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-text-secondary">
                  未找到匹配的用户
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-bg-secondary/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-text-secondary px-1">
        共 {table.getRowModel().rows.length} 人
      </div>
    </div>
  );
}
