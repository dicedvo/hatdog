'use client'

import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Flag, CheckSquare, Square, MessageSquare, Send, Trash2 } from 'lucide-react';
import { Task, TaskComment, Subtask, TeamMember } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-200 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-200 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-200 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-200 text-red-800' }
];

const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' }
];

export function TaskDetailModal({ task, isOpen, onClose, onUpdate, teamMembers }: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  teamMembers: TeamMember[];
}) {
  const { user, organization } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      loadComments();
      loadSubtasks();
    }
  }, [task, isOpen]);

  const loadComments = async () => {
    if (!task) return;
    
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error loading comments:', error);
    } else if (data) {
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
    
    if (error) {
      console.error('Error adding comment:', error);
      alert(`Failed to add comment: ${error.message}`);
    } else {
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
      setNewSubtask('');
      loadSubtasks();
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    const { error } = await supabase
      .from('subtasks')
      .update({ completed: !subtask.completed })
      .eq('id', subtask.id);
    
    if (!error) {
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

  const markAsDone = () => {
    handleUpdateTask({ status: 'done' });
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
              <select
                value={task.status}
                onChange={(e) => handleUpdateTask({ status: e.target.value as any })}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                {STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
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
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
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
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
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
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User size={16} />
                  Assignee
                </h4>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: task.assignee.color }}
                    >
                      {task.assignee.initials}
                    </div>
                    <span className="text-sm text-gray-900">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Unassigned</span>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Due Date
                </h4>
                <span className="text-sm text-gray-900">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Flag size={16} />
                  Priority
                </h4>
                <select
                  value={task.priority}
                  onChange={(e) => handleUpdateTask({ priority: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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