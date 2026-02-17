
import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Settings, 
  Wrench, 
  History, 
  LayoutDashboard, 
  Gauge, 
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  Zap,
  Droplets,
  Wind,
  Disc,
  LifeBuoy,
  LogOut,
  Loader2
} from 'lucide-react';
import { INITIAL_MAINTENANCE_SCHEDULE } from './constants';
import { MaintenanceItem, MotorbikeState, MaintenanceCategory, ServiceLog } from './types';
import { calculateHealth, getStatusColor, getProgressColor } from './utils/calculations';
import { getMaintenanceAdvice } from './services/geminiService';
import AuthScreen from './AuthScreen';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [state, setState] = useState<MotorbikeState>({
    modelName: "My Daily Ride",
    currentOdo: 0,
    maintenanceItems: INITIAL_MAINTENANCE_SCHEDULE,
    history: []
  });
  const [dataLoading, setDataLoading] = useState(false);

  const [odoInput, setOdoInput] = useState('0');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'assistant'>('dashboard');
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Data with Firestore
  useEffect(() => {
    if (!user) return;

    setDataLoading(true);
    const userDocRef = doc(db, "users", user.uid);

    // Initial fetch
    getDoc(userDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        const fetchedData = docSnap.data() as MotorbikeState;
        setState(fetchedData);
        setOdoInput(fetchedData.currentOdo.toString());
      } else {
        // Create initial doc for new user
        setDoc(userDocRef, state);
      }
      setDataLoading(false);
    });

    // Real-time listener for multi-device sync
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as MotorbikeState;
        setState(data);
        // Only update input if it's currently focused or matches state? 
        // For simplicity, we just keep input and state in sync here if not user-interacted
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Push updates to Firestore
  const saveStateToFirebase = async (newState: MotorbikeState) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), newState);
    } catch (err) {
      console.error("Firebase Sync Error:", err);
    }
  };

  const updateOdo = async () => {
    const newVal = parseInt(odoInput);
    if (!isNaN(newVal) && newVal >= state.currentOdo) {
      const newState = { ...state, currentOdo: newVal };
      setState(newState);
      await saveStateToFirebase(newState);
    }
  };

  const markServiceDone = async (item: MaintenanceItem) => {
    const newLog: ServiceLog = {
      id: crypto.randomUUID(),
      itemId: item.id,
      itemName: item.name,
      odoAtService: state.currentOdo,
      date: new Date().toISOString()
    };

    const updatedItems = state.maintenanceItems.map(i => {
      if (i.id === item.id) {
        let engineOilCount = i.engineOilCount || 0;
        if (i.id === 'engine-oil') engineOilCount += 1;
        
        return {
          ...i,
          lastServiceOdo: state.currentOdo,
          lastServiceDate: new Date().toISOString(),
          engineOilCount
        };
      }
      return i;
    });

    const newState = {
      ...state,
      maintenanceItems: updatedItems,
      history: [newLog, ...state.history]
    };

    setState(newState);
    await saveStateToFirebase(newState);
  };

  const handleLogout = () => signOut(auth);

  const fetchAIAdvice = async () => {
    setIsAdviceLoading(true);
    const advice = await getMaintenanceAdvice(state);
    setAiAdvice(advice);
    setIsAdviceLoading(false);
  };

  const getCategoryIcon = (cat: MaintenanceCategory) => {
    switch (cat) {
      case MaintenanceCategory.OIL_LUBE: return <Droplets className="w-5 h-5 text-amber-500" />;
      case MaintenanceCategory.AIR_SYSTEM: return <Wind className="w-5 h-5 text-sky-500" />;
      case MaintenanceCategory.ELECTRICAL: return <Zap className="w-5 h-5 text-yellow-500" />;
      case MaintenanceCategory.DRIVE_SYSTEM: return <Wrench className="w-5 h-5 text-slate-400" />;
      case MaintenanceCategory.BRAKES: return <Disc className="w-5 h-5 text-red-500" />;
      case MaintenanceCategory.TIRES: return <LifeBuoy className="w-5 h-5 text-zinc-300" />;
      default: return <Wrench className="w-5 h-5 text-indigo-500" />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">Initializing</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSuccess={() => {}} />;
  }

  const criticalItems = state.maintenanceItems
    .filter(item => calculateHealth(item, state.currentOdo).status === 'Critical');

  const warningItems = state.maintenanceItems
    .filter(item => calculateHealth(item, state.currentOdo).status === 'Warning');

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto bg-slate-950 text-slate-100 flex flex-col">
      <header className="p-6 sticky top-0 z-30 glass-card border-b border-white/10 rounded-b-2xl mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-500 to-sky-400 bg-clip-text text-transparent">MotoCare PH</h1>
            <p className="text-xs text-slate-400 font-medium">Hello, <span className="text-indigo-400">{user.email?.split('@')[0]}</span></p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleLogout}
              className="p-2 rounded-full bg-slate-900/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all border border-white/5"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full bg-slate-900/50 hover:bg-white/10 transition-all text-slate-400 border border-white/5">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl border-indigo-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Odometer</span>
            <div className="flex items-center gap-2">
              {dataLoading && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
              <Gauge className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <input 
              type="number" 
              value={odoInput}
              onChange={(e) => setOdoInput(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xl font-bold w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button 
              onClick={updateOdo}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg transition-all active:scale-95 whitespace-nowrap"
            >
              Update
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-6 flex-grow">
        {activeTab === 'dashboard' && (
          <>
            {(criticalItems.length > 0 || warningItems.length > 0) && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
                <div>
                  <h3 className="font-bold text-red-500 text-sm">Attention Required!</h3>
                  <p className="text-[11px] text-red-200/80">
                    You have {criticalItems.length} critical and {warningItems.length} items needing review soon.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold">Service Items</h2>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{state.maintenanceItems.length} Items</span>
              </div>

              {state.maintenanceItems.map((item) => {
                const health = calculateHealth(item, state.currentOdo);
                const statusColorClass = getStatusColor(health.status);
                const progressColorClass = getProgressColor(health.status);

                return (
                  <div key={item.id} className="glass-card rounded-2xl overflow-hidden group border-white/5">
                    <div className="p-4 flex items-start gap-4">
                      <div className="p-3 bg-slate-900 rounded-xl border border-white/5">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h3 className="font-bold text-slate-100 text-sm">{item.name}</h3>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{item.category}</p>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase ${statusColorClass}`}>
                            {health.status}
                          </span>
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] mb-1.5 font-bold text-slate-400">
                            <span>{health.percentage.toFixed(0)}% Health</span>
                            <span>{item.intervalKm ? `${health.remaining.toLocaleString()} km left` : `${health.remaining} mo left`}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className={`h-full transition-all duration-700 ease-out ${progressColorClass}`}
                              style={{ width: `${health.percentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button 
                            onClick={() => markServiceDone(item)}
                            className="flex-1 bg-slate-900 hover:bg-indigo-600 hover:text-white transition-all py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border border-white/5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark Completed
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-lg font-bold px-1">Service History</h2>
            {state.history.length === 0 ? (
              <div className="text-center py-12 opacity-30">
                <History className="w-12 h-12 mx-auto mb-3" />
                <p className="text-sm font-medium">No records yet, Paps.</p>
              </div>
            ) : (
              state.history.map((log) => (
                <div key={log.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-indigo-600 border-white/5">
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">{log.itemName}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">At {log.odoAtService.toLocaleString()} km</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-slate-300">{new Date(log.date).toLocaleDateString()}</p>
                    <p className="text-[9px] text-indigo-500 uppercase font-black tracking-tighter">VERIFIED</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="text-center py-4">
              <div className="w-20 h-20 bg-indigo-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-indigo-500/30 animate-pulse">
                <BrainCircuit className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-xl font-black">AI Maintenance Guru</h2>
              <p className="text-sm text-slate-500 font-medium">Smart status analysis for your ride.</p>
            </div>

            <div className="glass-card p-6 rounded-3xl relative overflow-hidden border-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-[0.02]">
                <BrainCircuit className="w-32 h-32" />
              </div>
              
              {aiAdvice ? (
                <div className="relative z-10">
                  <p className="text-slate-300 leading-relaxed font-medium italic text-sm">"{aiAdvice}"</p>
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={fetchAIAdvice}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3 fill-indigo-400" />
                      Refetch Analysis
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm mb-6 font-medium italic">Ready to see your maintenance priorities?</p>
                  <button 
                    disabled={isAdviceLoading}
                    onClick={fetchAIAdvice}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black px-8 py-3 rounded-full transition-all flex items-center gap-2 mx-auto shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    {isAdviceLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-white" />
                        Ask Guru
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-indigo-500" />
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Guide Disclaimer</h4>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal font-medium">
                Analysis is generated by Gemini AI based on your input. This is a supportive tool and does not replace official service manuals or professional mechanical inspections.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full py-12 text-center mt-auto opacity-40">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">
          MotoCare Premium &copy; 2025
        </p>
        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">
          Created by Grazus
        </p>
      </footer>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-50">
        <div className="glass-card bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-2 rounded-3xl flex items-center justify-between shadow-2xl shadow-black">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Status</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('assistant')}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all ${activeTab === 'assistant' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <BrainCircuit className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Guru</span>
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <History className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Logs</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
