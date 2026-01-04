import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { TaskCard } from './components/TaskCard';
import { Button } from './components/Button';
import { USERS, MACHINES, INITIAL_TASKS } from './constants';
import { Role, Task, TaskPriority, TaskStatus, User } from './types';
import { generateTaskDetails } from './services/geminiService';
import { Activity, AlertCircle, Bot, CheckCircle2, Clock, Camera, Image as ImageIcon, X } from 'lucide-react';

// Use a simple mock login state
const App: React.FC = () => {
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  
  // Create Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [machineNameInput, setMachineNameInput] = useState(''); // Text input for machine
  const [taskImage, setTaskImage] = useState<string | null>(null); // State for image
  const [selectedAssignee, setSelectedAssignee] = useState(USERS.filter(u => u.role === Role.MASTER)[0].id);
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Persistence (Mock)
  useEffect(() => {
    const savedTasks = localStorage.getItem('hidro_tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('hidro_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Handlers
  const handleLogin = (userId: string) => {
    const user = USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setCurrentView('tasks');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;

      const updatedTask = { ...t, status: newStatus };
      
      // Capture Start Time
      if (newStatus === TaskStatus.IN_PROGRESS && !t.startedAt) {
        updatedTask.startedAt = Date.now();
      }
      
      // Capture Completion Time
      if (newStatus === TaskStatus.COMPLETED && !t.completedAt) {
        updatedTask.completedAt = Date.now();
      }

      return updatedTask;
    }));
  };

  const handleEnrichWithAI = async () => {
    if (!newTaskTitle) return;
    setIsGeneratingAI(true);
    // Determine context from input or default
    const context = machineNameInput || 'Hidrolik Makine';
    const suggestion = await generateTaskDetails(newTaskTitle, context);
    setNewTaskDesc(prev => (prev ? prev + "\n\n" : "") + suggestion);
    setIsGeneratingAI(false);
  };

  // Mock function to simulate adding an image
  const handleAddImage = () => {
    // In a real app, this would open a file picker.
    // For this demo, we set a sample image of a hydraulic leak.
    setTaskImage("https://images.unsplash.com/photo-1596464716127-f2a82984de30?q=80&w=800&auto=format&fit=crop");
  };

  const handleRemoveImage = () => {
    setTaskImage(null);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskTitle,
      description: newTaskDesc,
      machineName: machineNameInput, // Save manual input
      imageUrl: taskImage || undefined, // Save image
      assigneeId: selectedAssignee,
      creatorId: currentUser!.id,
      priority: selectedPriority,
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
    };
    setTasks([newTask, ...tasks]);
    setCurrentView('tasks');
    // Reset form
    setNewTaskTitle('');
    setNewTaskDesc('');
    setMachineNameInput('');
    setTaskImage(null);
  };

  // Render Logic
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200">
             <Activity size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">HidroTakip</h1>
          <p className="text-slate-500 mb-8">Fabrika İçi Hidrolik Bakım Yönetim Sistemi</p>
          
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Giriş Yapılacak Rolü Seçin</p>
            {USERS.map(user => (
              <button
                key={user.id}
                onClick={() => handleLogin(user.id)}
                className="w-full flex items-center p-3 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
              >
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full mr-4 grayscale group-hover:grayscale-0 transition-all" />
                <div className="text-left">
                  <div className="font-semibold text-slate-700 group-hover:text-indigo-700">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.role === Role.MANAGER ? 'Birim Amiri' : 'Bakım Ustası'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filter tasks based on role
  const relevantTasks = tasks.filter(task => {
    if (currentUser.role === Role.MANAGER) return true; // Manager sees all
    return task.assigneeId === currentUser.id; // Master sees only theirs
  });

  const pendingCount = relevantTasks.filter(t => t.status === TaskStatus.PENDING).length;
  const inProgressCount = relevantTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
  const completedCount = relevantTasks.filter(t => t.status === TaskStatus.COMPLETED).length;

  return (
    <Layout 
      currentUser={currentUser} 
      currentView={currentView} 
      onChangeView={setCurrentView}
      onLogout={handleLogout}
    >
      
      {/* VIEW: DASHBOARD */}
      {currentView === 'dashboard' && (
        <div className="space-y-6">
          <header className="mb-6">
             <h1 className="text-2xl font-bold text-slate-800">Hoş Geldin, {currentUser.name.split(' ')[0]} 👋</h1>
             <p className="text-slate-500">Birim durumu özeti aşağıdadır.</p>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatCard label="Bekleyen" value={pendingCount} icon={<Clock className="text-orange-500" />} color="bg-orange-50" />
             <StatCard label="İşlemde" value={inProgressCount} icon={<Activity className="text-blue-500" />} color="bg-blue-50" />
             <StatCard label="Tamamlanan" value={completedCount} icon={<CheckCircle2 className="text-green-500" />} color="bg-green-50" />
             <StatCard label="Toplam Makine" value={MACHINES.length} icon={<AlertCircle className="text-indigo-500" />} color="bg-indigo-50" />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Acil Müdahale Gerekenler</h2>
            <div className="space-y-4">
              {relevantTasks
                .filter(t => t.priority === TaskPriority.URGENT || t.priority === TaskPriority.HIGH)
                .slice(0, 3) // Show top 3
                .map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    machines={MACHINES} 
                    users={USERS} 
                    currentUser={currentUser}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
                {relevantTasks.filter(t => t.priority === TaskPriority.URGENT || t.priority === TaskPriority.HIGH).length === 0 && (
                  <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">Harika! Acil bir durum yok.</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CREATE TASK (Manager Only) */}
      {currentView === 'create' && currentUser.role === Role.MANAGER && (
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Yeni Arıza/Bakım Görevi</h2>
          <form onSubmit={handleCreateTask} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Arıza Başlığı</label>
              <input 
                type="text" 
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Örn: Pres Ana Pompa Basınç Kaybı"
                className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Makine Adı/Yeri</label>
                <input 
                  type="text"
                  required
                  value={machineNameInput}
                  onChange={(e) => setMachineNameInput(e.target.value)}
                  placeholder="Örn: C Blok Pres 4"
                  className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Öncelik</label>
                 <select 
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as TaskPriority)}
                  className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value={TaskPriority.LOW}>Düşük</option>
                  <option value={TaskPriority.MEDIUM}>Orta</option>
                  <option value={TaskPriority.HIGH}>Yüksek</option>
                  <option value={TaskPriority.URGENT}>ACİL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Görevli Usta</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {USERS.filter(u => u.role === Role.MASTER).map(u => (
                   <div 
                    key={u.id}
                    onClick={() => setSelectedAssignee(u.id)}
                    className={`
                      cursor-pointer flex items-center p-2 rounded-lg border transition-all
                      ${selectedAssignee === u.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}
                    `}
                   >
                     <img src={u.avatar} alt="" className="w-8 h-8 rounded-full mr-2" />
                     <span className="text-sm font-medium text-slate-700">{u.name}</span>
                   </div>
                 ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                 <label className="block text-sm font-medium text-slate-700">Açıklama / Talimatlar</label>
                 <button 
                  type="button"
                  onClick={handleEnrichWithAI}
                  disabled={isGeneratingAI || !newTaskTitle}
                  className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                 >
                   <Bot size={14} className="mr-1" />
                   {isGeneratingAI ? 'AI Düşünüyor...' : 'AI ile Zenginleştir'}
                 </button>
              </div>
              <textarea 
                rows={5}
                required
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                placeholder="Arıza detaylarını buraya girin..."
                className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm mb-2"
              />
              
              {/* Image Upload Area */}
              <div className="mt-2">
                 {!taskImage ? (
                    <button
                      type="button"
                      onClick={handleAddImage}
                      className="flex items-center space-x-2 text-sm text-slate-600 hover:text-indigo-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Camera size={16} />
                      <span>Fotoğraf Ekle (Örnek)</span>
                    </button>
                 ) : (
                   <div className="relative inline-block mt-2">
                     <img src={taskImage} alt="Task" className="h-24 w-auto rounded-lg border border-slate-200 shadow-sm" />
                     <button
                       type="button"
                       onClick={handleRemoveImage}
                       className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                     >
                       <X size={12} />
                     </button>
                   </div>
                 )}
              </div>
            </div>

            <Button type="submit" fullWidth size="lg">Görevi Ata</Button>
          </form>
        </div>
      )}

      {/* VIEW: TASK LIST */}
      {currentView === 'tasks' && (
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4">
             {currentUser.role === Role.MANAGER ? 'Tüm Görevler' : 'Görevlerim'}
          </h2>
          
          {/* Tabs for filters could go here */}
          
          <div className="space-y-4">
            {relevantTasks.map(task => (
               <TaskCard 
                  key={task.id} 
                  task={task} 
                  machines={MACHINES} 
                  users={USERS} 
                  currentUser={currentUser}
                  onUpdateStatus={handleUpdateStatus}
                />
            ))}
            {relevantTasks.length === 0 && (
               <div className="text-center py-12">
                 <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                   <CheckCircle2 className="text-slate-400" size={32} />
                 </div>
                 <h3 className="text-lg font-medium text-slate-900">Görev Bulunamadı</h3>
                 <p className="text-slate-500 mt-1">Şu anda listelenecek bir görev yok.</p>
               </div>
            )}
          </div>
        </div>
      )}

    </Layout>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
    <div className={`p-2 rounded-lg mb-2 ${color} bg-opacity-50`}>
      {icon}
    </div>
    <div className="text-2xl font-bold text-slate-800">{value}</div>
    <div className="text-xs text-slate-500 font-medium">{label}</div>
  </div>
);

export default App;