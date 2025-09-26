'use client'

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { organizationsAPI, teamAPI } from '@/lib/api';
import { Users, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, refreshOrganization } = useAuth();
  const router = useRouter();

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setError(null);
    setLoading(true);

    try {
      const org = await organizationsAPI.create(teamName, user.id);
      
      await teamAPI.create({
        organization_id: org.id,
        user_id: user.id,
        name: user.email?.split('@')[0] || 'User',
        email: user.email || '',
        initials: user.email?.substring(0, 2).toUpperCase() || 'US',
        color: '#3B82F6',
        role: 'owner',
        is_active: true
      });

      await refreshOrganization();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setError(null);
    setLoading(true);

    try {
      const org = await organizationsAPI.getByInviteCode(inviteCode.toUpperCase());
      
      await teamAPI.create({
        organization_id: org.id,
        user_id: user.id,
        name: user.email?.split('@')[0] || 'User',
        email: user.email || '',
        initials: user.email?.substring(0, 2).toUpperCase() || 'US',
        color: '#3B82F6',
        role: 'member',
        is_active: true
      });

      await refreshOrganization();
      router.push('/');
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to join team';
      
      if (errorMessage.includes('duplicate key value violates unique constraint')) {
        if (errorMessage.includes('team_members_user_org_unique')) {
          setError('You are already a member of this team');
        } else if (errorMessage.includes('team_members_email_org_unique')) {
          setError('This email is already registered in this team');
        } else if (errorMessage.includes('team_members_email_key')) {
          setError('This email is already in use. Please run the database migration to allow multi-team membership.');
        } else {
          setError('You are already a member of this team');
        }
      } else if (errorMessage === 'JSON object requested, multiple (or no) rows returned') {
        setError('Invalid invite code');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-blue-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Hatdog!</h1>
            <p className="text-gray-600">Get started by creating or joining a team</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-between group"
            >
              <span>Create a new team</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg hover:bg-gray-200 font-medium flex items-center justify-between group"
            >
              <span>Join existing team</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="mb-6">
            <button
              onClick={() => setMode('select')}
              className="text-gray-600 hover:text-gray-900 text-sm mb-4"
            >
              ← Back
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Create your team</h2>
            <p className="text-gray-600 mt-1">Choose a name for your team</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Team Name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
                placeholder="Acme Inc."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="mb-6">
          <button
            onClick={() => setMode('select')}
            className="text-gray-600 hover:text-gray-900 text-sm mb-4"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Join a team</h2>
          <p className="text-gray-600 mt-1">Enter the invite code from your team</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleJoinTeam} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white font-mono text-lg tracking-wider"
              placeholder="ABCD1234"
              required
              maxLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Team'}
          </button>
        </form>
      </div>
    </div>
  );
}