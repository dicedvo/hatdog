'use client'

import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, User, Calendar, AlertCircle, Edit2, Trash2, X, Users, LogOut, Copy, Check, MoreVertical, CheckCircle2, Circle, CheckSquare } from 'lucide-react';
import { tasksAPI, teamAPI, columnsAPI } from '@/lib/api';
import { Task, TeamMember } from '@/types';
import { TeamModal } from '@/components/TeamModal';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const DEFAULT_COLUMNS = [
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
function DroppableColumn({ column, tasks, children, onRename, onDelete, onAddTask }: { 
  column: any; 
  tasks: Task[]; 
  children: React.ReactNode;
  onRename?: (columnId: string, newName: string) => void;
  onDelete?: (columnId: string) => void;
  onAddTask?: (columnId: string) => void;
}) {
  // For column dragging
  const { 
    attributes, 
    listeners, 
    setNodeRef: setSortableNodeRef, 
    transform, 
    transition,
    isDragging
  } = useSortable({
    id: `column-${column.id}`,
  });
  
  // For task dropping
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column: column
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [showMenu, setShowMenu] = React.useState<boolean>(false);
  const [isRenaming, setIsRenaming] = React.useState<boolean>(false);
  const [newTitle, setNewTitle] = React.useState<string>(column.title);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleRename = () => {
    if (onRename && newTitle.trim()) {
      onRename(column.id, newTitle.trim());
    } else {
      setNewTitle(column.title);
    }
    setIsRenaming(false);
  };

  React.useEffect(() => {
    setNewTitle(column.title);
  }, [column.title]);

  return (
    <div
      ref={setSortableNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-sm transition-all flex flex-col flex-shrink-0 ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-400' : ''
      }`}
    >
      <div 
        ref={setDroppableNodeRef}
        style={{
          minHeight: '400px',
          minWidth: '280px',
          maxWidth: '280px',
          touchAction: 'none'
        }}
        className="flex flex-col h-full"
      >
      <div className="p-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="cursor-move p-1 -m-1 hover:bg-gray-100 rounded" {...listeners} {...attributes}>
              <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                <circle cx="3" cy="3" r="1.5" fill="currentColor"/>
                <circle cx="9" cy="3" r="1.5" fill="currentColor"/>
                <circle cx="3" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="3" cy="17" r="1.5" fill="currentColor"/>
                <circle cx="9" cy="17" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            {isRenaming ? (
              <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={(e) => {
                // Only handle rename if we're not clicking within the same component
                setTimeout(() => {
                  if (isRenaming) {
                    handleRename();
                  }
                }, 100);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRename();
                }
                if (e.key === 'Escape') {
                  setNewTitle(column.title);
                  setIsRenaming(false);
                }
              }}
              className="font-medium text-gray-900 bg-white border-b-2 border-blue-500 outline-none px-1 py-0.5 min-w-[100px] rounded-sm"
              autoFocus
              />
            ) : (
              <h3 className="font-medium text-gray-900">{column.title}</h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-gray-100 text-gray-600 text-sm px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
              >
                <MoreVertical size={16} />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl py-1 z-10 min-w-[180px]">
                  <button
                    onClick={() => {
                      setIsRenaming(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-700 font-medium"
                  >
                    <Edit2 size={14} className="text-gray-600" />
                    Rename section
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => {
                      if (onDelete) onDelete(column.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium"
                  >
                    <Trash2 size={14} />
                    Delete section
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {children}
      </div>
      {onAddTask && (
        <button
          onClick={() => onAddTask(column.id)}
          className="m-4 mt-0 p-2.5 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
        >
          <Plus size={18} className="text-gray-600" />
          Add task
        </button>
      )}
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, onEdit, onDelete, onView, onToggleComplete, columns }: { 
  task: Task; 
  onEdit: (task: Task) => void; 
  onDelete: (id: string) => void;
  onView: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  columns?: any[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const priority = PRIORITIES.find(p => p.value === task.priority);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  const isDone = task.completed || false;
  
  // Get column name for status display
  const columnName = columns?.find(col => col.id === task.column_id)?.title || '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`p-4 rounded-lg shadow-sm border cursor-pointer flex flex-col ${
        isDone 
          ? 'bg-green-50 border-green-300' 
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}
      onClick={() => onView(task)}
    >
      {/* Top Row: Checkbox + Title + Actions */}
      <div className="flex items-start gap-2 mb-2">
        <div className="cursor-move p-1 -m-1 hover:bg-gray-100 rounded mt-0.5" {...listeners} {...attributes}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
            <circle cx="2" cy="2" r="1" fill="currentColor"/>
            <circle cx="7" cy="2" r="1" fill="currentColor"/>
            <circle cx="2" cy="8" r="1" fill="currentColor"/>
            <circle cx="7" cy="8" r="1" fill="currentColor"/>
            <circle cx="2" cy="14" r="1" fill="currentColor"/>
            <circle cx="7" cy="14" r="1" fill="currentColor"/>
          </svg>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          className="mt-0.5 text-gray-400 hover:text-green-600"
        >
          {isDone ? <CheckCircle2 size={20} className="text-green-600" /> : <Circle size={20} />}
        </button>
        <h3 className={`font-medium text-base break-words flex-1 ${
          isDone ? 'line-through text-gray-500' : 'text-gray-900'
        }`}>{task.title}</h3>
        <div className="flex gap-1 pointer-events-auto">
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
      
      {/* Middle Row: Status + Priority + Assignee (left aligned) */}
      <div className="flex items-center gap-2 mb-2 ml-12">
        {columnName && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            {columnName}
          </span>
        )}
        {priority && (
          <span className={`px-2 py-0.5 rounded-full text-xs ${priority.color}`}>
            {priority.label}
          </span>
        )}
        {task.assignee && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium"
            style={{ backgroundColor: task.assignee.color }}
          >
            {task.assignee.initials}
          </div>
        )}
      </div>
      
      {/* Description */}
      {task.description && (
        <p className="text-gray-600 text-sm mb-2 line-clamp-2 ml-12">{task.description}</p>
      )}
      
      {/* Bottom Row: Date (left) | Subtasks (right) */}
      <div className="flex items-center justify-between text-xs text-gray-500 ml-12">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
              {isOverdue && <AlertCircle size={12} />}
              <Calendar size={12} />
              <span>{new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Placeholder for subtasks - uncomment when implemented */}
          {/* <div className="flex items-center gap-1">
            <CheckSquare size={12} />
            <span>0/0</span>
          </div> */}
        </div>
      </div>
    </div>
  );
}

// Task Form Modal
function TaskModal({ task, isOpen, onClose, onSave, teamMembers, defaultStatus, columns }: {
  task?: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: any) => void;
  teamMembers: TeamMember[];
  defaultStatus?: string | null;
  columns?: any[];
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
        status: defaultStatus || 'todo',
        priority: 'medium',
        assigneeId: '',
        dueDate: ''
      });
    }
  }, [task, isOpen, defaultStatus]);

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
                {(columns || DEFAULT_COLUMNS).map(column => (
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
  const [deleteColumnConfirm, setDeleteColumnConfirm] = useState<{ isOpen: boolean; columnId: string | null; columnTitle: string | null }>({ isOpen: false, columnId: null, columnTitle: null });
  const [copiedCode, setCopiedCode] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [newTaskColumnId, setNewTaskColumnId] = useState<string | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
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
      // First try to load columns
      let columnsData = [];
      try {
        columnsData = await columnsAPI.getAll(organization.id);
        if (columnsData.length === 0) {
          // Initialize default columns if none exist
          await columnsAPI.initializeDefaults(organization.id);
          columnsData = await columnsAPI.getAll(organization.id);
        }
      } catch (e) {
        // If columns table doesn't exist, use default columns
        columnsData = DEFAULT_COLUMNS;
      }
      
      const [tasksData, teamData] = await Promise.all([
        tasksAPI.getAll(organization.id),
        teamAPI.getAll(organization.id)
      ]);
      
      setColumns(columnsData.length > 0 ? columnsData : DEFAULT_COLUMNS);
      setTasks(tasksData);
      setTeamMembers(teamData);
    } catch (error: any) {
      setError(error?.message || 'Failed to load data. Check your Supabase configuration in .env.local');
    } finally {
      setLoading(false);
    }
  };

  function handleDragStart(event: any) {
    const id = event.active.id;
    setActiveId(id);
    // Prevent body scroll while dragging on mobile
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    
    // Re-enable body scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Check if we're dragging a column
    if (activeId.toString().startsWith('column-')) {
      const draggedColumnId = activeId.toString().replace('column-', '');
      const overColumnId = overId.toString().startsWith('column-') ? overId.toString().replace('column-', '') : overId.toString();
      
      if (draggedColumnId !== overColumnId) {
        const oldIndex = columns.findIndex(col => col.id === draggedColumnId);
        const newIndex = columns.findIndex(col => col.id === overColumnId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedColumns = arrayMove(columns, oldIndex, newIndex);
          setColumns(reorderedColumns);
          // Update positions in database in background
          Promise.all(
            reorderedColumns.map((col, index) => 
              columnsAPI.update(col.id, { position: index }).catch(e => {
                console.error('Failed to update column position:', e);
              })
            )
          );
        }
      }
      return;
    }

    // Otherwise, we're dragging a task
    const activeTask = tasks.find(task => task.id === activeId);
    if (!activeTask) return;

    // Determine target column
    let targetColumnId: string = '';
    
    // Check if we're dropping on a column (overId might have "column-" prefix)
    if (overId.startsWith('column-')) {
      // Remove the "column-" prefix to get actual column ID
      targetColumnId = overId.replace('column-', '');
    } else {
      // Check if it's a direct column ID
      const isColumn = columns.some(col => col.id === overId);
      if (isColumn) {
        targetColumnId = overId;
      } else {
        // We're dropping on a task - find its column
        const overTask = tasks.find(task => task.id === overId);
        if (overTask) {
          targetColumnId = overTask.column_id || overTask.status || '';
        }
      }
    }

    if (!targetColumnId) {
      return;
    }
    
    const currentColumnId = activeTask.column_id || activeTask.status || '';
    
    // Skip if moving to same column and not reordering
    if (targetColumnId === currentColumnId && !overId.startsWith('column-')) {
      // Handle reordering within same column if needed
      const overTask = tasks.find(task => task.id === overId);
      if (overTask) {
        const oldIndex = tasks.findIndex(t => t.id === activeId);
        const newIndex = tasks.findIndex(t => t.id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
          setTasks(reorderedTasks);
        }
      }
      return;
    }

    // Moving to a different column
    
    // Find the target column to get its proper status name
    const targetColumn = columns.find(c => c.id === targetColumnId);
    const statusValue = targetColumn ? 
      targetColumn.title.toLowerCase().replace(/\s+/g, '-') : 
      targetColumnId;
    
    // Update the task with new column
    const updatedTask = { 
      ...activeTask, 
      column_id: targetColumnId,
      status: statusValue
    };
    
    // Update local state immediately for smooth UI
    setTasks(prevTasks => 
      prevTasks.map(task => task.id === activeTask.id ? updatedTask : task)
    );

    // Update in database with both column_id and status
    const updateData: any = {
      column_id: targetColumnId
    };
    
    // Only update status if it's one of the default columns
    if (['todo', 'in-progress', 'review', 'done'].includes(statusValue)) {
      updateData.status = statusValue;
    }

    tasksAPI.update(activeTask.id, updateData).catch(error => {
      console.error('Failed to update task:', error);
      // Only reload on error
      loadData();
    });
  }

  const handleCreateTask = async (taskData: any) => {
    if (!organization) return;
    
    setError(null);
    try {
      // If creating from column button, use that column's status
      const columnId = newTaskColumnId || taskData.status || columns[0]?.id || 'todo';
      const column = columns.find(c => c.id === columnId) || columns[0];
      const status = column ? column.title.toLowerCase().replace(/\s+/g, '-') : 'todo';
      
      await tasksAPI.create({
        ...taskData,
        status: status,
        column_id: column?.id || columnId,
        organization_id: organization.id,
        position: tasks.filter(t => {
          if (t.column_id) return t.column_id === columnId;
          return t.status === columnId || t.status === status;
        }).length
      });
      loadData();
      setNewTaskColumnId(null);
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
    setNewTaskColumnId(null);
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      await tasksAPI.update(task.id, {
        completed: !task.completed,
        completed_at: !task.completed ? new Date().toISOString() : null
      });
      loadData();
    } catch (error: any) {
      setError(error?.message || 'Failed to update task.');
    }
  };

  const handleAddTaskToColumn = (columnId: string) => {
    setNewTaskColumnId(columnId);
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleDeleteColumn = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column) {
      setDeleteColumnConfirm({ isOpen: true, columnId, columnTitle: column.title });
    }
  };

  const confirmDeleteColumn = async () => {
    if (deleteColumnConfirm.columnId && organization) {
      try {
        // Try to delete from database
        try {
          await columnsAPI.delete(deleteColumnConfirm.columnId);
        } catch (e) {
          // If it fails (table doesn't exist), just update local state
        }
        setColumns(columns.filter(c => c.id !== deleteColumnConfirm.columnId));
        setDeleteColumnConfirm({ isOpen: false, columnId: null, columnTitle: null });
      } catch (error: any) {
        setError(error?.message || 'Failed to delete column');
      }
    }
  };

  const handleAddColumn = async () => {
    if (newColumnTitle.trim() && organization) {
      try {
        const position = columns.length;
        // Try to save to database
        try {
          const newColumn = await columnsAPI.create({
            organization_id: organization.id,
            title: newColumnTitle.trim(),
            position: position,
            color: 'gray'
          });
          setColumns([...columns, newColumn]);
        } catch (e: any) {
          // If it fails (table doesn't exist), just update local state
          const newColumn = {
            id: `col-${columns.length}-${newColumnTitle.trim().toLowerCase().replace(/\s+/g, '-')}`,
            title: newColumnTitle.trim(),
            color: 'bg-gray-100'
          };
          setColumns([...columns, newColumn]);
        }
        setNewColumnTitle('');
        setShowAddColumn(false);
      } catch (error: any) {
        setError(error?.message || 'Failed to add column');
      }
    }
  };

  const handleRenameColumn = async (columnId: string, newName: string) => {
    if (organization) {
      try {
        // Try to update in database
        try {
          await columnsAPI.update(columnId, { title: newName });
        } catch (e) {
          // If it fails (table doesn't exist), just update local state
        }
        setColumns(prevColumns => prevColumns.map(col => 
          col.id === columnId ? { ...col, title: newName } : col
        ));
      } catch (error: any) {
        setError(error?.message || 'Failed to rename column');
      }
    }
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[]}
        >
          <SortableContext
            items={columns.map(col => `column-${col.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 sm:gap-6 pb-4" style={{ minWidth: 'min-content' }}>
            {columns.map(column => {
              const columnTasks = tasks
                .filter(task => {
                  // Simple check - match by column_id or status
                  return (task.column_id === column.id) || (task.status === column.id);
                })
                .sort((a, b) => a.position - b.position);

              return (
                <DroppableColumn 
                  key={column.id} 
                  column={column} 
                  tasks={columnTasks}
                  onAddTask={handleAddTaskToColumn}
                  onDelete={handleDeleteColumn}
                  onRename={handleRenameColumn}
                >
                  <SortableContext
                    items={columnTasks.map(task => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {columnTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={openEditModal}
                          onDelete={handleDeleteTask}
                          onView={setViewingTask}
                          onToggleComplete={handleToggleComplete}
                          columns={columns}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              );
            })}
            
            {/* Add Column Button */}
            <div className="flex-shrink-0" style={{ minWidth: '280px', maxWidth: '280px' }}>
              {showAddColumn ? (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddColumn();
                      if (e.key === 'Escape') {
                        setShowAddColumn(false);
                        setNewColumnTitle('');
                      }
                    }}
                    placeholder="Enter column title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddColumn}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Add Column
                    </button>
                    <button
                      onClick={() => {
                        setShowAddColumn(false);
                        setNewColumnTitle('');
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddColumn(true)}
                  className="w-full h-full min-h-[200px] bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gray-800 transition-all"
                >
                  <Plus size={24} />
                  <span className="font-medium">Add Column</span>
                </button>
              )}
            </div>
            </div>
          </SortableContext>
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
        defaultStatus={newTaskColumnId}
        columns={columns}
      />

      {/* Team Modal */}
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onRefresh={loadData}
      />

      {/* Delete Task Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, taskId: null })}
        onConfirm={confirmDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />

      {/* Delete Column Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteColumnConfirm.isOpen}
        onClose={() => setDeleteColumnConfirm({ isOpen: false, columnId: null, columnTitle: null })}
        onConfirm={confirmDeleteColumn}
        title="Delete Column"
        message={`Are you sure you want to delete the "${deleteColumnConfirm.columnTitle}" column? All tasks in this column will need to be reassigned.`}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={viewingTask}
        isOpen={!!viewingTask}
        onClose={() => setViewingTask(null)}
        onUpdate={loadData}
        teamMembers={teamMembers}
        columns={columns}
      />
    </div>
  );
}