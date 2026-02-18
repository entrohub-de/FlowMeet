'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Shield, ShieldOff, ShieldCheck, Search, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getAllUsersWithRoles, updateUserRole, getHostApplications, approveHostApplication, rejectHostApplication, type UserWithRole, type HostApplicationWithProfile } from '@/lib/api/admin';
import type { UserRole } from '@/lib/api/role';

type Filter = 'all' | 'host' | 'admin';

export default function AdminHostsPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [applications, setApplications] = useState<HostApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, appsData] = await Promise.all([
        getAllUsersWithRoles(),
        getHostApplications(),
      ]);
      setUsers(usersData);
      setApplications(appsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const confirmMsg =
      newRole === 'host'
        ? t('admin.hosts.confirmPromote')
        : t('admin.hosts.confirmDemote');

    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error('Failed to update role:', err);
      alert(t('admin.hosts.updateFailed'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = async (app: HostApplicationWithProfile) => {
    if (!window.confirm(t('admin.hosts.confirmApprove'))) return;

    setProcessingAppId(app.id);
    try {
      await approveHostApplication(app.id, app.user_id);
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: 'approved' } : a))
      );
      setUsers((prev) =>
        prev.map((u) => (u.user_id === app.user_id ? { ...u, role: 'host' as UserRole } : u))
      );
    } catch (err) {
      console.error('Failed to approve application:', err);
      alert(t('admin.hosts.updateFailed'));
    } finally {
      setProcessingAppId(null);
    }
  };

  const handleReject = async (app: HostApplicationWithProfile) => {
    if (!window.confirm(t('admin.hosts.confirmReject'))) return;

    setProcessingAppId(app.id);
    try {
      await rejectHostApplication(app.id);
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: 'rejected' } : a))
      );
    } catch (err) {
      console.error('Failed to reject application:', err);
      alert(t('admin.hosts.updateFailed'));
    } finally {
      setProcessingAppId(null);
    }
  };

  const pendingApplications = applications.filter((a) => a.status === 'pending');

  const filteredUsers = users.filter((u) => {
    if (filter === 'host' && u.role !== 'host') return false;
    if (filter === 'admin' && u.role !== 'admin') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (u.nickname?.toLowerCase().includes(q)) ||
        u.user_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('admin.hosts.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('admin.hosts.description')}
            </p>
          </div>
        </div>

        {/* Pending Applications */}
        {pendingApplications.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h2 className="font-semibold text-foreground">
                {t('admin.hosts.applications.title')}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200">
                {pendingApplications.length}
              </span>
            </div>
            <div className="space-y-2">
              {pendingApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between bg-white dark:bg-card rounded-lg p-3 border border-border"
                >
                  <div>
                    <div className="font-medium text-foreground text-sm">
                      {app.nickname || app.user_id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('admin.hosts.applications.appliedAt', {
                        time: new Date(app.created_at).toLocaleDateString(),
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {processingAppId === app.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(app)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {t('admin.hosts.applications.approve')}
                        </button>
                        <button
                          onClick={() => handleReject(app)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {t('admin.hosts.applications.reject')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.hosts.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'host', 'admin'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f === 'all'
                  ? t('admin.hosts.allUsers')
                  : f === 'host'
                    ? t('admin.hosts.hostsOnly')
                    : t('admin.hosts.adminsOnly')}
              </button>
            ))}
          </div>
        </div>

        {/* User count */}
        <div className="text-sm text-muted-foreground">
          {t('admin.hosts.totalCount', { count: filteredUsers.length })}
        </div>

        {/* User List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {t('common.loading')}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {t('admin.hosts.noHosts')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">
                      {t('admin.hosts.nickname')}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t('admin.hosts.role')}
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      {t('admin.hosts.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-foreground">
                            {user.nickname || user.user_id.slice(0, 8)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.user_id.slice(0, 12)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-50 text-purple-700'
                              : user.role === 'host'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.role === 'admin' ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : user.role === 'host' ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <ShieldOff className="w-3 h-3" />
                          )}
                          {t(`profile.roleUpgrade.roles.${user.role}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.role === 'admin' ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : updatingId === user.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin inline-block text-muted-foreground" />
                        ) : user.role === 'host' ? (
                          <button
                            onClick={() =>
                              handleRoleChange(user.user_id, 'user')
                            }
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                          >
                            {t('admin.hosts.demoteToUser')}
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleRoleChange(user.user_id, 'host')
                            }
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            {t('admin.hosts.promoteToHost')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
