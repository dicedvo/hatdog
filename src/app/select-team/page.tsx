'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, ArrowRight, Plus } from 'lucide-react';
import { Organization } from '@/types';

export default function SelectTeamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

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
      // Get all organizations user is a member of
      const { data: teamMembers, error } = await supabase
        .from('team_members')
        .select('organization_id, organizations(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      const orgs = teamMembers
        ?.map((tm: any) => tm.organizations)
        .filter(Boolean) || [];

      setTeams(orgs);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = (orgId: string) => {
    // Store selected org in localStorage
    localStorage.setItem('selected_organization_id', orgId);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading your teams...</div>
      </div>
    );
  }

  return (
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
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => selectTeam(team.id)}
                  className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 py-3 px-4 rounded-lg font-medium flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="text-blue-600" size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{team.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{team.invite_code}</div>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-transform" />
                </button>
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
  );
}