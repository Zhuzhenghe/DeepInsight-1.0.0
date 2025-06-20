'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Users, Search, Shield, MoreVertical, Edit, Trash2, ChevronLeft, ChevronRight, UserPlus, Filter, Crown, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { apiGet, apiPut } from '@/lib/api/client';

interface UserWithStats {
  id: string;
  email: string;
  username: string;
  role: 'free' | 'pro' | 'admin';
  createdAt: string;
  isActive: boolean;
  totalTokens: number;
  totalChats: number;
  lastActiveAt?: string | null;
}

const SettingsSection = ({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) => (
  <div className="flex flex-col space-y-4 p-4 bg-light-secondary/50 dark:bg-dark-secondary/50 rounded-xl border border-light-200 dark:border-dark-200">
    <h2 className="text-black/90 dark:text-white/90 font-medium">{title}</h2>
    {children}
  </div>
);

const RoleBadge = ({ role }: { role: string }) => {
  const config = {
    admin: { text: '管理员', className: 'bg-purple-500/10 text-purple-500' },
    pro: { text: 'Pro', className: 'bg-blue-500/10 text-blue-500' },
    free: { text: '免费', className: 'bg-gray-500/10 text-gray-500' },
  }[role] || { text: role, className: 'bg-gray-500/10 text-gray-500' };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.text}
    </span>
  );
};

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  const fetchUsers = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    
    try {
      setUsersLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      
      const response = await apiGet(`/api/admin/users?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [user, page, search, roleFilter, limit]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchUsers();
    }
  }, [user, page, search, roleFilter, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？')) return;
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('删除用户失败:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/20"></div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col pt-4">
        <div className="flex items-center space-x-2">
          <Link href="/admin" className="lg:hidden">
            <ArrowLeft className="text-black/70 dark:text-white/70" />
          </Link>
          <div className="flex flex-row space-x-0.5 items-center">
            <Users size={23} />
            <h1 className="text-3xl font-medium p-2">User Management</h1>
          </div>
        </div>
        <hr className="border-t border-[#2B2C2C] my-4 w-full" />
      </div>

      <div className="flex flex-col space-y-6 pb-28 lg:pb-8">
        {/* 搜索和筛选 */}
        <SettingsSection title="Search & Filter">
          <div className="flex flex-col md:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/50 dark:text-white/50" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索用户名或邮箱..."
                  className="w-full pl-10 pr-3 py-2 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg text-sm"
            >
              <option value="">所有角色</option>
              <option value="free">免费用户</option>
              <option value="pro">Pro 用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
        </SettingsSection>

        {/* 用户列表 */}
        <SettingsSection title={`Users (${total})`}>
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-200 dark:border-dark-200"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-black/30 dark:text-white/30 mx-auto mb-3" />
              <p className="text-black/60 dark:text-white/60">暂无用户</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-black/60 dark:text-white/60">
                      <th className="pb-3">用户</th>
                      <th className="pb-3">角色</th>
                      <th className="pb-3">使用量</th>
                      <th className="pb-3">注册时间</th>
                      <th className="pb-3">最后活跃</th>
                      <th className="pb-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-t border-light-200 dark:border-dark-200"
                      >
                        <td className="py-3">
                          <div>
                            <p className="text-sm font-medium text-black/90 dark:text-white/90">
                              {user.username}
                            </p>
                            <p className="text-xs text-black/60 dark:text-white/60">
                              {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="py-3">
                          <div className="text-sm">
                            <p className="text-black/90 dark:text-white/90">
                              {user.totalTokens.toLocaleString()} tokens
                            </p>
                            <p className="text-xs text-black/60 dark:text-white/60">
                              {user.totalChats} 对话
                            </p>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-black/70 dark:text-white/70">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-3 text-sm text-black/70 dark:text-white/70">
                          {user.lastActiveAt ? formatDate(user.lastActiveAt) : '-'}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="p-1.5 hover:bg-light-200 dark:hover:bg-dark-200 rounded transition-colors"
                            >
                              <Edit className="w-4 h-4 text-black/70 dark:text-white/70" />
                            </Link>
                            {user.id !== users[0]?.id && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-black/60 dark:text-white/60">
                    第 {page + 1} 页，共 {totalPages} 页
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page === totalPages - 1}
                      className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </SettingsSection>
      </div>
    </div>
  );
} 