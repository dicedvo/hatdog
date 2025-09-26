'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, ArrowRight, Plus, Settings, Trash2, X } from 'lucide-react';
import { Organization } from '@/types';

export default function SelectTeamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<{team: Organization; role: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean; team: Organization | null}>({isOpen: false, team: null});
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    loadUserTeams();
  }, [user]);

  const loadUserTeams = async () => {
    if (!user) return;

    try {
      // Get all organizations user is a member of with their role
      const { data: teamMembers, error } = await supabase
        .from('team_members')
        .select('organization_id, role, organizations(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      const teamsWithRoles = teamMembers
        ?.filter((tm: any) => tm.organizations)
        .map((tm: any) => ({
          team: tm.organizations,
          role: tm.role
        })) || [];

      setTeams(teamsWithRoles);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = (orgId: string) => {
    // Store selected org in localStorage
    localStorage.setItem('selected_organization_id', orgId);
    router.push('/');
  };

  const handleDeleteTeam = async () => {
    if (!deleteModal.team || deleteConfirmText !== deleteModal.team.name) {
      setDeleteError(`Please type "${deleteModal.team?.name}" to confirm`);
      return;
    }

    try {
      // Delete the organization (cascade will delete all related data)
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', deleteModal.team.id);

      if (error) throw error;

      // Refresh teams list
      await loadUserTeams();
      setDeleteModal({isOpen: false, team: null});
      setDeleteConfirmText('');
      setDeleteError('');
    } catch (error) {
      setDeleteError('Failed to delete team. You might not have permission.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading your teams...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Select a team</h1>
          <p className="text-gray-600">Choose which team you'd like to work with</p>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">You're not part of any teams yet</p>
            <button
              onClick={() => router.push('/onboarding')}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Create or Join a Team
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {teams.map((item) => (
                <div
                  key={item.team.id}
                  className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 py-3 px-4 rounded-lg font-medium flex items-center justify-between group transition-colors"
                >
                  <button
                    onClick={() => selectTeam(item.team.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.team.name}</span>
                        {item.role && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                            item.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.role}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{item.team.invite_code}</div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {item.role === 'owner' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({isOpen: true, team: item.team});
                          setDeleteConfirmText('');
                          setDeleteError('');
                        }}
                        className="text-gray-400 hover:text-red-600 p-2"
                        title="Delete Team"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <ArrowRight size={20} className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => router.push('/onboarding')}
                className="w-full text-blue-600 hover:text-blue-700 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Create or Join Another Team
              </button>
            </div>
          </>
        )}
        </div>
      </div>
      
      {/* Delete Team Modal */}
      {deleteModal.isOpen && deleteModal.team && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Team</h2>
            <button 
              onClick={() => {
                setDeleteModal({isOpen: false, team: null});
                setDeleteConfirmText('');
                setDeleteError('');
              }} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 mb-2">
              <strong>Warning:</strong> This action cannot be undone. This will permanently delete:
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside">
              <li>The <strong>{deleteModal.team.name}</strong> team</li>
              <li>All tasks in this team</li>
              <li>All team members</li>
              <li>All comments and subtasks</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Please type <strong className="font-mono bg-gray-100 px-1">{deleteModal.team.name}</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 text-black bg-white"
                placeholder="Enter team name"
              />
              {deleteError && (
                <p className="text-red-600 text-sm mt-1">{deleteError}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDeleteModal({isOpen: false, team: null});
                  setDeleteConfirmText('');
                  setDeleteError('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={deleteConfirmText !== deleteModal.team.name}
                className={`flex-1 py-2 px-4 rounded-md font-medium ${
                  deleteConfirmText === deleteModal.team.name
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-100 text-red-300 cursor-not-allowed'
                }`}
              >
                Delete Team
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
    </>
  );
}