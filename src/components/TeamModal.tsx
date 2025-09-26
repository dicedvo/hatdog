'use client'

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Users } from 'lucide-react';
import { TeamMember } from '@/types';
import { teamAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Generate random color for new team members
const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6'];

function TeamMemberForm({ member, onSave, onCancel }: {
  member?: TeamMember;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    initials: '',
    color: COLORS[0]
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email || '',
        initials: member.initials,
        color: member.color
      });
    }
  }, [member]);

  // Auto-generate initials when name changes
  useEffect(() => {
    if (!member && formData.name) {
      const names = formData.name.trim().split(' ');
      const initials = names.map(name => name.charAt(0).toUpperCase()).join('').slice(0, 3);
      setFormData(prev => ({ ...prev, initials }));
    }
  }, [formData.name, member]);

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.initials.trim()) return;
    
    onSave({
      ...formData,
      color: formData.color || COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
          placeholder="Enter team member name..."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
          placeholder="Enter email address..."
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Initials</label>
          <input
            type="text"
            value={formData.initials}
            onChange={(e) => setFormData({ ...formData, initials: e.target.value.toUpperCase() })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
            placeholder="CP"
            maxLength={3}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-900' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
        >
          {member ? 'Update Member' : 'Add Member'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Confirmation Modal Component
function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function TeamModal({ isOpen, onClose, onRefresh }: {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { organization, canManageTeam, user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; memberId: string | null }>({ isOpen: false, memberId: null });

  // Load team members when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTeamMembers();
    }
  }, [isOpen]);

  const loadTeamMembers = async () => {
    if (!organization) return;
    
    setLoading(true);
    setError(null);
    try {
      const members = await teamAPI.getAll(organization.id);
      setTeamMembers(members);
    } catch (error: any) {
      setError(error?.message || 'Failed to load team members. Check your Supabase configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMember = async (memberData: any) => {
    if (!organization) return;
    
    setError(null);
    try {
      if (editingMember) {
        // Update existing member (you'd need to add update method to teamAPI)
      } else {
        // Create new member
        await teamAPI.create({
          organization_id: organization.id,
          name: memberData.name,
          email: memberData.email || null,
          initials: memberData.initials,
          color: memberData.color,
          role: 'member',
          is_active: true
        });
      }
      
      await loadTeamMembers();
      onRefresh(); // Refresh the main task board
      setShowForm(false);
      setEditingMember(undefined);
    } catch (error: any) {
      setError(error?.message || 'Failed to save team member. Check your Supabase configuration.');
    }
  };

  const startEdit = (member: TeamMember) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingMember(undefined);
  };

  const handleDeleteMember = async (memberId: string) => {
    setDeleteConfirm({ isOpen: true, memberId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.memberId) return;
    
    setError(null);
    try {
      await teamAPI.delete(deleteConfirm.memberId);
      await loadTeamMembers();
      onRefresh();
    } catch (error: any) {
      setError(error?.message || 'Failed to delete team member.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-gray-900" />
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
            <p className="text-red-600 text-xs mt-1">Make sure your Supabase API key is configured in .env.local</p>
          </div>
        )}

        {showForm ? (
          <TeamMemberForm
            member={editingMember}
            onSave={handleSaveMember}
            onCancel={cancelForm}
          />
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">
                Manage your team members and their assignments
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
              >
                <Plus size={14} />
                Add Member
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading team members...</div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map(member => {
                  const isCurrentUser = member.user_id === user?.id;
                  const canEdit = canManageTeam || isCurrentUser;
                  const canDelete = canManageTeam && !isCurrentUser;
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{member.name}</h3>
                            {isCurrentUser && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">You</span>
                            )}
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded capitalize">{member.role}</span>
                          </div>
                          {member.email && (
                            <p className="text-sm text-gray-500">{member.email}</p>
                          )}
                        </div>
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-2">
                          {canEdit && (
                            <button
                              onClick={() => startEdit(member)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-gray-400 hover:text-red-600 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {teamMembers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No team members yet. Add your first team member to get started!
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, memberId: null })}
          onConfirm={confirmDelete}
          title="Delete Team Member"
          message="Are you sure you want to delete this team member? This action cannot be undone."
        />
      </div>
    </div>
  );
}   