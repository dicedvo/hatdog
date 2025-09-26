'use client'

import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, User, Calendar, AlertCircle, Edit2, Trash2, X, Users, LogOut, Copy, Check } from 'lucide-react';
import { tasksAPI, teamAPI } from '@/lib/api';
import { Task, TeamMember } from '@/types';
import { TeamModal } from '@/components/TeamModal';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'review', title: 'Review', color: 'bg-yellow-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-200 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-200 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-200 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-200 text-red-800' }
];

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

// Droppable Column Component
function DroppableColumn({ column, tasks, children }: { column: any; tasks: Task[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg shadow-sm p-4 transition-colors ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-400' : ''
      }`}
    >
      {children}
    </div>
  );
}

// Task Card Component
function TaskCard({ task, onEdit, onDelete, onView }: { 
  task: Task; 
  onEdit: (task: Task) => void; 
  onDelete: (id: string) => void;
  onView: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const priority = PRIORITIES.find(p => p.value === task.priority);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  const isDone = task.status === 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => onView(task)}
      className={`p-3 rounded-lg shadow-sm border transition-shadow cursor-pointer ${
        isDone 
          ? 'bg-green-50 border-green-200 opacity-75' 
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-medium text-sm flex-1 cursor-grab active:cursor-grabbing ${
          isDone ? 'line-through text-gray-500' : 'text-gray-900'
        }`} {...listeners} onClick={(e) => e.stopPropagation()}>{task.title}</h3>
        <div className="flex gap-1 ml-2 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEdit(task);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete(task.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      
      {task.description && (
        <p className="text-gray-600 text-xs mb-2 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {priority && (
            <span className={`px-2 py-1 rounded-full text-xs ${priority.color}`}>
              {priority.label}
            </span>
          )}
          
          {task.assignee && (
            <div className="flex items-center gap-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: task.assignee.color }}
              >
                {task.assignee.initials}
              </div>
            </div>
          )}
        </div>
        
        {task.due_date && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
            {isOverdue && <AlertCircle size={12} />}
            <Calendar size={12} />
            <span>{new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Task Form Modal
function TaskModal({ task, isOpen, onClose, onSave, teamMembers }: {
  task?: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: any) => void;
  teamMembers: TeamMember[];
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigneeId: '',
    dueDate: ''
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assigneeId: task.assignee_id || '',
        dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assigneeId: '',
        dueDate: ''
      });
    }
  }, [task, isOpen]);

  const handleSubmit = () => {
    if (!formData.title.trim()) return;
    
    const taskData = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      assignee_id: formData.assigneeId || null,
      due_date: formData.dueDate || null,
    };

    onSave(taskData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{task ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
              placeholder="Enter task title..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
              placeholder="Enter task description..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
              >
                {COLUMNS.map(column => (
                  <option key={column.id} value={column.id}>{column.title}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
              >
                {PRIORITIES.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Assignee</label>
            <select
              value={formData.assigneeId}
              onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
            >
              <option value="">Unassigned</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500 bg-white"
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
            >
              {task ? 'Update Task' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main TaskBoard Component
export default function TaskBoard() {
  const { user, organization, loading: authLoading, signOut, userRole } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [loading, setLoading] = useState(true);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
  const [copiedCode, setCopiedCode] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (!authLoading && user && !organization) {
      router.push('/select-team');
    } else if (!authLoading && user && organization) {
      loadData();
    }
  }, [authLoading, user, organization, router]);

  const loadData = async () => {
    if (!organization) return;
    
    setError(null);
    try {
      const [tasksData, teamData] = await Promise.all([
        tasksAPI.getAll(organization.id),
        teamAPI.getAll(organization.id)
      ]);
      setTasks(tasksData);
      setTeamMembers(teamData);
    } catch (error: any) {
      setError(error?.message || 'Failed to load data. Check your Supabase configuration in .env.local');
    } finally {
      setLoading(false);
    }
  };

  function handleDragStart(event: any) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(task => task.id === activeId);
    if (!activeTask) return;

    const isOverColumn = COLUMNS.some(col => col.id === overId);
    const targetColumnId = isOverColumn ? overId : tasks.find(task => task.id === overId)?.status;

    if (!targetColumnId) return;

    // Update task status in database
    tasksAPI.updatePosition(activeId, targetColumnId, 0).then(() => {
      loadData(); // Reload to get updated data
    });
  }

  const handleCreateTask = async (taskData: any) => {
    if (!organization) return;
    
    setError(null);
    try {
      await tasksAPI.create({
        ...taskData,
        organization_id: organization.id,
        position: tasks.filter(t => t.status === taskData.status).length
      });
      loadData();
    } catch (error: any) {
      setError(error?.message || 'Failed to create task. Check your Supabase configuration.');
    }
  };

  const handleEditTask = async (taskData: any) => {
    if (!editingTask) return;
    
    setError(null);
    try {
      await tasksAPI.update(editingTask.id, {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assignee_id: taskData.assignee_id,
        due_date: taskData.due_date
      });
      loadData();
      setEditingTask(undefined);
    } catch (error: any) {
      setError(error?.message || 'Failed to update task.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeleteConfirm({ isOpen: true, taskId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.taskId) return;
    
    setError(null);
    try {
      await tasksAPI.delete(deleteConfirm.taskId);
      loadData();
    } catch (error: any) {
      setError(error?.message || 'Failed to delete task.');
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(undefined);
  };

  const copyInviteCode = async () => {
    if (!organization) return;
    await navigator.clipboard.writeText(organization.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading TaskBoard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Hatdog</h1>
                {userRole && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize font-medium">
                    {userRole}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{organization?.name || 'Loading...'}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {organization && (
                <div className="hidden md:flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-600">Invite Code:</span>
                  <code className="font-mono font-bold text-gray-900">{organization.invite_code}</code>
                  <button
                    onClick={copyInviteCode}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {copiedCode ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              )}
              <button
                onClick={() => setIsTeamModalOpen(true)}
                className="bg-gray-600 text-white p-2 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2 font-medium"
              >
                <Users size={16} />
                <span className="hidden sm:inline">Team</span>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 text-white p-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">New Task</span>
              </button>
              <button
                onClick={signOut}
                className="text-gray-600 hover:text-gray-900 p-2"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">Error: {error}</p>
            <p className="text-red-600 text-sm mt-1">
              Please ensure your NEXT_PUBLIC_SUPABASE_ANON_KEY is set correctly in .env.local
            </p>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {COLUMNS.map(column => {
              const columnTasks = tasks
                .filter(task => task.status === column.id)
                .sort((a, b) => a.position - b.position);

              return (
                <DroppableColumn key={column.id} column={column} tasks={columnTasks}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">{column.title}</h3>
                    <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  
                  <SortableContext
                    items={columnTasks.map(task => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3 min-h-[200px]">
                      {columnTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={openEditModal}
                          onDelete={handleDeleteTask}
                          onView={setViewingTask}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              );
            })}
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="bg-white p-3 rounded-lg shadow-xl border-2 border-blue-400 opacity-90 cursor-grabbing transform rotate-3">
                {(() => {
                  const activeTask = tasks.find(t => t.id === activeId);
                  if (!activeTask) return null;
                  const priority = PRIORITIES.find(p => p.value === activeTask.priority);
                  
                  return (
                    <>
                      <h3 className="font-medium text-gray-900 text-sm mb-2">{activeTask.title}</h3>
                      {activeTask.description && (
                        <p className="text-gray-600 text-xs mb-2 line-clamp-2">{activeTask.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        {priority && (
                          <span className={`px-2 py-1 rounded-full text-xs ${priority.color}`}>
                            {priority.label}
                          </span>
                        )}
                        {activeTask.assignee && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium"
                            style={{ backgroundColor: activeTask.assignee.color }}
                          >
                            {activeTask.assignee.initials}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Modal */}
      <TaskModal
        task={editingTask}
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={editingTask ? handleEditTask : handleCreateTask}
        teamMembers={teamMembers}
      />

      {/* Team Modal */}
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onRefresh={loadData}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, taskId: null })}
        onConfirm={confirmDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={viewingTask}
        isOpen={!!viewingTask}
        onClose={() => setViewingTask(null)}
        onUpdate={loadData}
        teamMembers={teamMembers}
      />
    </div>
  );
}