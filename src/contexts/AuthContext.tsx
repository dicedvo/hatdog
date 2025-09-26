'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Organization } from '@/types';
import { organizationsAPI } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  userRole: 'owner' | 'admin' | 'member' | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
  isOwner: boolean;
  isAdmin: boolean;
  canManageTeam: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadOrganization(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadOrganization(session.user.id);
      } else {
        setOrganization(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadOrganization = async (userId: string) => {
    try {
      // Check if user has a selected organization in localStorage
      const selectedOrgId = localStorage.getItem('selected_organization_id');
      
      if (selectedOrgId) {
        const org = await organizationsAPI.getById(selectedOrgId);
        setOrganization(org);
        
        // Get user's role in this organization
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('role')
          .eq('user_id', userId)
          .eq('organization_id', selectedOrgId)
          .single();
        
        setUserRole(teamMember?.role || 'member');
      } else {
        // Fall back to getting first org user is part of
        const org = await organizationsAPI.getUserOrganization(userId);
        setOrganization(org);
        
        if (org) {
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('role')
            .eq('user_id', userId)
            .eq('organization_id', org.id)
            .single();
          
          setUserRole(teamMember?.role || 'member');
        }
      }
    } catch (error) {
      console.error('Error loading organization:', error);
      setOrganization(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshOrganization = async () => {
    if (user) {
      await loadOrganization(user.id);
    }
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setOrganization(null);
    setUserRole(null);
    localStorage.removeItem('selected_organization_id');
  };

  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin';
  const canManageTeam = userRole === 'owner' || userRole === 'admin';

  const value = {
    user,
    organization,
    userRole,
    loading,
    signUp,
    signIn,
    signOut,
    refreshOrganization,
    isOwner,
    isAdmin,
    canManageTeam,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}