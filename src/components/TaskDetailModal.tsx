'use client'

import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, User, Flag, CheckSquare, Square, MessageSquare, Send, Trash2, Check, ChevronDown } from 'lucide-react';
import { Task, TaskComment, Subtask, TeamMember } from '@/types';
import { supabase } from '@/lib/supabase';
import { tasksAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-200 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-200 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-200 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-200 text-red-800' }
];

const DEFAULT_STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' }
];

export function TaskDetailModal({ task, isOpen, onClose, onUpdate, teamMembers, columns }: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  teamMembers: TeamMember[];
  columns?: any[];
}) {
  const { user, organization } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const [localAssignees, setLocalAssignees] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (task && isOpen) {
      loadComments();
      loadSubtasks();
      // Initialize local assignees from task
      setLocalAssignees(task.assignees || []);
      
      // Set up realtime subscriptions for this task
      const channel = supabase
        .channel(`task-${task.id}-updates`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_comments',
            filter: `task_id=eq.${task.id}`
          },
          () => {
            loadComments();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subtasks',
            filter: `task_id=eq.${task.id}`
          },
          () => {
            loadSubtasks();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `id=eq.${task.id}`
          },
          () => {
            // Refresh task data when it changes
            onUpdate();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_assignees',
            filter: `task_id=eq.${task.id}`
          },
          () => {
            // Refresh task data when assignees change
            onUpdate();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [task, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
    }
    
    if (showAssigneeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssigneeDropdown]);

  const loadComments = async () => {
    if (!task) return;
    
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setComments(data);
    }
  };

  const loadSubtasks = async () => {
    if (!task) return;
    
    const { data, error } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', task.id)
      .order('position');
    
    if (!error && data) {
      setSubtasks(data);
    }
  };

  const handleAddComment = async () => {
    if (!task || !user || !newComment.trim()) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('task_comments')
      .insert({
        task_id: task.id,
        user_id: user.id,
        content: newComment
      });
    
    if (!error) {
      // Notify all assignees about the new comment
      const assigneesToNotify = task.assignees?.filter(a => a.user_id !== user.id) || [];
      const commenterMember = teamMembers.find(m => m.user_id === user.id);
      const commenterName = commenterMember?.name || user.email || 'A team member';
      
      for (const assignee of assigneesToNotify) {
        if (assignee.email) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'task-comment',
              data: {
                recipientName: assignee.name || 'Team Member',
                recipientEmail: assignee.email,
                taskTitle: task.title,
                commenterName: commenterName,
                comment: newComment,
                taskUrl: window.location.href
              }
            })
          });
        }
      }
      
      setNewComment('');
      loadComments();
    }
    setLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId);
    
    if (!error) {
      loadComments();
    }
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtask.trim()) return;
    
    const { error } = await supabase
      .from('subtasks')
      .insert({
        task_id: task.id,
        title: newSubtask,
        position: subtasks.length
      });
    
    if (!error) {
      // Notify all assignees about the new checklist item
      const assigneesToNotify = task.assignees?.filter(a => a.user_id !== user?.id) || [];
      const adderMember = teamMembers.find(m => m.user_id === user?.id);
      const adderName = adderMember?.name || user?.email || 'A team member';
      
      for (const assignee of assigneesToNotify) {
        if (assignee.email) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'task-checklist',
              data: {
                recipientName: assignee.name || 'Team Member',
                recipientEmail: assignee.email,
                taskTitle: task.title,
                adderName: adderName,
                checklistItem: newSubtask,
                taskUrl: window.location.href
              }
            })
          });
        }
      }
      
      setNewSubtask('');
      loadSubtasks();
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    const isCompleting = !subtask.completed;
    
    const { error } = await supabase
      .from('subtasks')
      .update({ completed: isCompleting })
      .eq('id', subtask.id);
    
    if (!error && isCompleting && task) {
      // Notify all assignees when a checklist item is completed
      const assigneesToNotify = task.assignees?.filter(a => a.user_id !== user?.id) || [];
      const completerMember = teamMembers.find(m => m.user_id === user?.id);
      const completerName = completerMember?.name || user?.email || 'A team member';
      
      for (const assignee of assigneesToNotify) {
        if (assignee.email) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'checklist-completed',
              data: {
                recipientName: assignee.name || 'Team Member',
                recipientEmail: assignee.email,
                taskTitle: task.title,
                completerName: completerName,
                checklistItem: subtask.title,
                taskUrl: window.location.href
              }
            })
          });
        }
      }
      
      loadSubtasks();
    } else if (!error) {
      loadSubtasks();
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', subtaskId);
    
    if (!error) {
      loadSubtasks();
    }
  };

  const handleUpdateTask = async (updates: Partial<Task>) => {
    if (!task) return;
    
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task.id);
    
    if (!error) {
      onUpdate();
    }
  };

  const markAsDone = async () => {
    if (!task) return;
    
    await handleUpdateTask({ completed: true, completed_at: new Date() });
    
    // Notify all assignees and creator when task is marked done
    const assigneesToNotify = task.assignees?.filter(a => a.user_id !== user?.id) || [];
    const completerMember = teamMembers.find(m => m.user_id === user?.id);
    const completerName = completerMember?.name || user?.email || 'A team member';
    
    // Also notify creator if different from completer
    if (task.created_by && task.created_by !== user?.id) {
      const creator = task.creator || teamMembers.find(m => m.user_id === task.created_by);
      if (creator?.email) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'task-completed',
            data: {
              creatorName: creator.name || 'Team Member',
              creatorEmail: creator.email,
              taskTitle: task.title,
              completedByName: completerName,
              taskUrl: window.location.href
            }
          })
        });
      }
    }
    
    // Notify all assignees
    for (const assignee of assigneesToNotify) {
      if (assignee.email) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'task-completed',
            data: {
              creatorName: assignee.name || 'Team Member',
              creatorEmail: assignee.email,
              taskTitle: task.title,
              completedByName: completerName,
              taskUrl: window.location.href
            }
          })
        });
      }
    }
  };

  const handleToggleAssignee = async (memberId: string) => {
    if (!task) return;
    
    try {
      const member = teamMembers.find(m => m.id === memberId);
      if (!member) return;
      
      // Update local state immediately for instant UI feedback
      const currentAssigneeIds = localAssignees.map(a => a.id);
      let newAssignees: TeamMember[];
      let newAssigneeIds: string[];
      
      if (currentAssigneeIds.includes(memberId)) {
        // Remove the assignee
        newAssignees = localAssignees.filter(a => a.id !== memberId);
        newAssigneeIds = newAssignees.map(a => a.id);
      } else {
        // Add the assignee
        newAssignees = [...localAssignees, member];
        newAssigneeIds = newAssignees.map(a => a.id);
      }
      
      // Update local state immediately
      setLocalAssignees(newAssignees);
      
      // Update assignees in database
      await tasksAPI.updateAssignees(task.id, newAssigneeIds);
      
      // Don't close dropdown - keep it open for multiple selections
      // Refresh the parent data
      onUpdate();
    } catch (error) {
      console.error('Failed to update assignees:', error);
      // Revert local state on error
      setLocalAssignees(task.assignees || []);
    }
  };

  if (!isOpen || !task) return null;

  const priority = PRIORITIES.find(p => p.value === task.priority);
  const completedSubtasks = subtasks.filter(st => st.completed).length;
  const totalSubtasks = subtasks.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {priority && (
                <span className={`px-3 py-1 rounded-full text-sm ${priority.color}`}>
                  {priority.label}
                </span>
              )}
              {task.status !== 'done' && (
                <button
                  onClick={markAsDone}
                  className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Mark as Done
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-6 p-6">
            {/* Main Content - 2 columns */}
            <div className="col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{task.description || 'No description provided'}</p>
              </div>

              {/* Subtasks */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Checklist {totalSubtasks > 0 && `(${completedSubtasks}/${totalSubtasks})`}
                </h3>
                <div className="space-y-2 mb-3">
                  {subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-2 group">
                      <button
                        onClick={() => handleToggleSubtask(subtask)}
                        className="text-gray-600 hover:text-blue-600"
                      >
                        {subtask.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                      <span className={`flex-1 ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="Add a checklist item..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
                  />
                  <button
                    onClick={handleAddSubtask}
                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Comments */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare size={20} />
                  Comments ({comments.length})
                </h3>
                <div className="space-y-3 mb-4">
                  {comments.map(comment => {
                    const commenter = teamMembers.find(m => m.user_id === comment.user_id);
                    return (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {commenter?.name || commenter?.email || user?.email || 'Unknown User'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                            {comment.user_id === user?.id && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm">{comment.content}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                    placeholder="Write a comment..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={loading || !newComment.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send size={16} />
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-4">
              <div className="relative" ref={assigneeDropdownRef}>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User size={16} />
                  Assignee
                </h4>
                <button
                  onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  className="w-full text-left border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  {localAssignees && localAssignees.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {localAssignees.slice(0, 3).map((assignee) => (
                          <div
                            key={assignee.id}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium border border-white"
                            style={{ backgroundColor: assignee.color }}
                          >
                            {assignee.initials}
                          </div>
                        ))}
                        {localAssignees.length > 3 && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border border-white bg-gray-300 text-gray-700">
                            +{localAssignees.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-900">
                        {localAssignees.map(a => a.name).join(', ')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Unassigned</span>
                  )}
                </button>
                
                {/* Assignee Dropdown */}
                {showAssigneeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 flex justify-between items-center">
                      <span className="text-xs text-gray-600">Select team members</span>
                      <button
                        type="button"
                        onClick={() => setShowAssigneeDropdown(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {teamMembers.map(member => {
                      // Check local assignees for immediate UI feedback
                      const isAssigned = localAssignees.some(a => a.id === member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleAssignee(member.id);
                          }}
                          className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-left transition-colors cursor-pointer"
                        >
                          <div className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center">
                            {isAssigned && <Check size={14} className="text-blue-600" />}
                          </div>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.initials}
                          </div>
                          <span className="text-sm text-gray-900">{member.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Due Date
                </h4>
                <input
                  type="date"
                  value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleUpdateTask({ due_date: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Flag size={16} />
                  Priority
                </h4>
                <select
                  value={task.priority}
                  onChange={(e) => handleUpdateTask({ priority: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}