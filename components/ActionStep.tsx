import React, { useState, useMemo, useEffect } from 'react';
import { JBPData, JBPAction, JBPStrategy } from '../types';
import { ACTION_OWNERS, OWNER_COLORS } from '../constants';
import { 
  Plus, X, Calendar as CalendarIcon, User, Trash2, 
  CheckCircle2, Circle, AlertCircle, Loader2, BrainCircuit, 
  ChevronDown, ChevronUp, ArrowRight, LayoutList, CalendarDays,
  MoreHorizontal, GripVertical, Layers, Filter
} from 'lucide-react';

interface DraggableActionProps {
  action: JBPAction;
  compact?: boolean;
  onDragStart: (e: React.DragEvent, actionId: string) => void;
  isContinuation?: boolean;
}

const DraggableAction: React.FC<DraggableActionProps> = ({ action, compact = false, onDragStart, isContinuation = false }) => {
  const primaryOwner = action.owners && action.owners.length > 0 ? action.owners[0] : '经销商';
  const colors = OWNER_COLORS[primaryOwner] || { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-500' };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, action.id)}
      className={`
        cursor-move shadow-sm rounded-md group hover:shadow-md transition-all select-none
        border relative
        ${compact ? 'p-1.5' : 'p-3 mb-2'}
        ${isContinuation ? 'opacity-60 border-dashed bg-slate-50' : `${colors.bg} ${colors.border}`}
      `}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className={`mt-0.5 flex-shrink-0 ${isContinuation ? 'text-slate-300' : 'text-slate-400'}`} />
        <div className="flex-grow min-w-0">
          <div className={`leading-tight break-words ${compact ? 'text-xs line-clamp-2' : 'text-sm'} ${isContinuation ? 'text-slate-500' : colors.text}`}>
            {action.title ? (
              <>
                <div className="font-bold">{action.title}</div>
                {!compact && <div className="text-xs mt-1 opacity-80">{action.content}</div>}
              </>
            ) : (
              <div className="font-medium">{action.text}</div>
            )}
          </div>
          {!isContinuation && (
            <div className="flex flex-wrap gap-1 mt-1.5">
               {!compact && (action.owners || []).map(o => (
                 <span key={o} className={`text-[10px] px-1.5 py-0.5 rounded ${OWNER_COLORS[o]?.badge || 'bg-slate-100 text-slate-500'}`}>
                   {o}
                 </span>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ActionStepProps {
  data: JBPData;
  updateData: (updates: Partial<JBPData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ActionStep: React.FC<ActionStepProps> = ({ data, updateData, onNext, onBack }) => {
  const [expandedObjectives, setExpandedObjectives] = useState<Record<string, boolean>>({});
  const [aiReasoning, setAiReasoning] = useState<Record<string, string>>({});
  
  // New State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [customOwnerInputs, setCustomOwnerInputs] = useState<Record<string, string>>({}); // actionId -> input value
  const [activeOwnerDropdown, setActiveOwnerDropdown] = useState<string | null>(null);
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [customDeadlineInputs, setCustomDeadlineInputs] = useState<Record<string, string>>({});

  // 验证状态
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // 检查策略是否有行动项
  const hasStrategyActions = (objId: string, stratId: string): boolean => {
    const obj = data.objectives.find(o => o.id === objId);
    if (!obj) return false;
    const strat = obj.strategies.find(s => s.id === stratId);
    if (!strat) return false;
    return strat.actions && strat.actions.length > 0;
  };

  // 检查行动项是否完整（标题、内容、负责人、时间排期）
  const isActionComplete = (action: JBPAction): boolean => {
    const hasTitle = !!(action.title && action.title.trim());
    const hasContent = !!(action.content && action.content.trim()) || !!(action.text && action.text.trim());
    const hasOwners = !!(action.owners && action.owners.length > 0);
    const hasDeadline = !!(action.deadline && action.deadline.trim());
    return hasTitle && hasContent && hasOwners && hasDeadline;
  };

  // 获取行动项缺少的字段
  const getActionMissingFields = (action: JBPAction): string[] => {
    const missing: string[] = [];
    if (!action.title || !action.title.trim()) missing.push('标题');
    if (!(action.content && action.content.trim()) && !(action.text && action.text.trim())) missing.push('内容');
    if (!action.owners || action.owners.length === 0) missing.push('负责人');
    if (!action.deadline || !action.deadline.trim()) missing.push('时间排期');
    return missing;
  };

  // 检查所有策略是否都有行动项，且所有行动项都完整
  const allStrategiesHaveActions = (): boolean => {
    for (const obj of data.objectives) {
      for (const strat of obj.strategies) {
        if (!strat.actions || strat.actions.length === 0) {
          return false;
        }
        // 检查每个行动项是否完整
        for (const action of strat.actions) {
          if (!isActionComplete(action)) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // 获取第一个不完整的项（可能是策略缺少行动项，或行动项字段不完整）
  const getFirstIncompleteItem = (): { 
    type: 'strategy' | 'action';
    objId: string; 
    stratId: string; 
    actionId?: string;
    objTitle: string; 
    stratText: string;
    missingFields?: string[];
  } | null => {
    for (const obj of data.objectives) {
      for (const strat of obj.strategies) {
        // 检查策略是否有行动项
        if (!strat.actions || strat.actions.length === 0) {
          return { 
            type: 'strategy',
            objId: obj.id, 
            stratId: strat.id, 
            objTitle: obj.title, 
            stratText: strat.text 
          };
        }
        // 检查每个行动项是否完整
        for (const action of strat.actions) {
          if (!isActionComplete(action)) {
            const missingFields = getActionMissingFields(action);
            return {
              type: 'action',
              objId: obj.id,
              stratId: strat.id,
              actionId: action.id,
              objTitle: obj.title,
              stratText: strat.text,
              missingFields
            };
          }
        }
      }
    }
    return null;
  };

  // 处理下一步点击
  const handleNextClick = () => {
    setHasAttemptedSubmit(true);
    
    const incomplete = getFirstIncompleteItem();
    if (incomplete) {
      // 展开对应的目标
      setExpandedObjectives(prev => ({ ...prev, [incomplete.objId]: true }));
      
      if (incomplete.type === 'strategy') {
        setValidationError(`请为"${incomplete.objTitle}"下的策略"${incomplete.stratText}"添加行动项`);
      } else {
        setValidationError(`请完善"${incomplete.objTitle}"下的行动项：缺少${incomplete.missingFields?.join('、')}`);
      }
      
      // 8秒后自动清除提示
      setTimeout(() => setValidationError(null), 8000);
      return;
    }
    
    setValidationError(null);
    onNext();
  };

  // 获取有任务的角色列表
  const getOwnersWithActions = (): string[] => {
    const ownersSet = new Set<string>();
    
    data.objectives.forEach(obj => {
      obj.strategies.forEach(strat => {
        strat.actions.forEach(action => {
          if (action.owners && action.owners.length > 0) {
            action.owners.forEach(owner => ownersSet.add(owner));
          }
        });
      });
    });
    
    return Array.from(ownersSet);
  };

  // Initialize expanded state
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    // Only expand the first objective by default
    if (data.objectives.length > 0) {
      initial[data.objectives[0].id] = true;
    }
    setExpandedObjectives(initial);
  }, []);

  // Migrate legacy 'owner' string to 'owners' array if needed
  useEffect(() => {
    let hasChanges = false;
    const newObjectives = data.objectives.map(obj => ({
      ...obj,
      strategies: obj.strategies.map(strat => ({
        ...strat,
        actions: strat.actions.map(act => {
          if (!act.owners && (act as any).owner) {
            hasChanges = true;
            return { ...act, owners: [(act as any).owner] };
          }
          if (!act.owners) {
            hasChanges = true;
            return { ...act, owners: [] };
          }
          return act;
        })
      }))
    }));

    if (hasChanges) {
      updateData({ objectives: newObjectives });
    }
  }, [data]); // Added data dependency to ensure migration runs on updates

  const toggleObjective = (id: string) => {
    setExpandedObjectives(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addCustomAction = (objId: string, stratId: string) => {
    const newAction: JBPAction = {
      id: `act_${Date.now()}`,
      text: '',
      title: '',
      content: '',
      owners: [],
      deadline: '',
      status: 'pending'
    };
    appendAction(objId, stratId, newAction);
  };

  const appendAction = (objId: string, stratId: string, action: JBPAction) => {
    const newObjectives = data.objectives.map(obj => {
      if (obj.id === objId) {
        return {
          ...obj,
          strategies: obj.strategies.map(strat => {
            if (strat.id === stratId) {
              return { ...strat, actions: [...strat.actions, action] };
            }
            return strat;
          })
        };
      }
      return obj;
    });
    updateData({ objectives: newObjectives });
  };

  const updateAction = (objId: string, stratId: string, actId: string, updates: Partial<JBPAction>) => {
    const newObjectives = data.objectives.map(obj => {
      if (obj.id === objId) {
        return {
          ...obj,
          strategies: obj.strategies.map(strat => {
            if (strat.id === stratId) {
              return {
                ...strat,
                actions: strat.actions.map(act => 
                  act.id === actId ? { ...act, ...updates } : act
                )
              };
            }
            return strat;
          })
        };
      }
      return obj;
    });
    updateData({ objectives: newObjectives });
  };

  const toggleOwner = (objId: string, stratId: string, actId: string, owner: string, currentOwners: string[]) => {
    let newOwners;
    if (currentOwners.includes(owner)) {
      newOwners = currentOwners.filter(o => o !== owner);
    } else {
      newOwners = [...currentOwners, owner];
    }
    updateAction(objId, stratId, actId, { owners: newOwners });
    // 选择负责人后关闭弹窗
    setActiveOwnerDropdown(null);
  };

  const removeAction = (objId: string, stratId: string, actId: string) => {
    const newObjectives = data.objectives.map(obj => {
      if (obj.id === objId) {
        return {
          ...obj,
          strategies: obj.strategies.map(strat => {
            if (strat.id === stratId) {
              return {
                ...strat,
                actions: strat.actions.filter(act => act.id !== actId)
              };
            }
            return strat;
          })
        };
      }
      return obj;
    });
    updateData({ objectives: newObjectives });
  };

  // --- Render Helpers ---

  const renderOwnerSelector = (objId: string, stratId: string, act: JBPAction) => {
    const currentOwners = act.owners || [];
    const inputValue = customOwnerInputs[act.id] || '';
    const isDropdownOpen = activeOwnerDropdown === act.id;

    return (
      <div className="flex flex-wrap gap-2 items-center">
        {currentOwners.map(owner => (
          <span key={owner} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${OWNER_COLORS[owner] || 'bg-slate-100 text-slate-600'}`}>
            {owner}
            <button 
              onClick={() => toggleOwner(objId, stratId, act.id, owner, currentOwners)}
              className="ml-1 hover:text-red-500"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        
        <div className="relative">
          <button 
            onClick={() => setActiveOwnerDropdown(isDropdownOpen ? null : act.id)}
            className={`flex items-center text-xs border rounded px-3 py-1 transition-colors ${isDropdownOpen ? 'border-brand-500 text-brand-700 bg-brand-50' : 'border-brand-200 text-brand-600 bg-white hover:bg-brand-50 hover:border-brand-300'}`}
          >
            <Plus size={12} className="mr-1.5" /> 添加负责人
          </button>
          
          {/* Dropdown for adding owners */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-lg rounded-lg p-2 z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="mb-2 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">选择或输入</span>
                <button onClick={() => setActiveOwnerDropdown(null)} className="text-slate-400 hover:text-slate-600"><X size={12}/></button>
              </div>
              <div className="mb-2">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:border-brand-300 focus:ring-1 focus:ring-brand-100 outline-none"
                    placeholder="自定义角色..."
                    value={inputValue}
                    onChange={(e) => setCustomOwnerInputs(prev => ({ ...prev, [act.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inputValue.trim()) {
                        toggleOwner(objId, stratId, act.id, inputValue.trim(), currentOwners);
                        setCustomOwnerInputs(prev => ({ ...prev, [act.id]: '' }));
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (inputValue.trim()) {
                        toggleOwner(objId, stratId, act.id, inputValue.trim(), currentOwners);
                        setCustomOwnerInputs(prev => ({ ...prev, [act.id]: '' }));
                      }
                    }}
                    disabled={!inputValue.trim()}
                    className="px-2 py-1 text-xs font-medium rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    添加
                  </button>
                </div>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {ACTION_OWNERS.map(owner => (
                  <button
                    key={owner}
                    onClick={() => toggleOwner(objId, stratId, act.id, owner, currentOwners)}
                    className={`w-full text-left text-xs px-2 py-1 rounded hover:bg-slate-50 flex justify-between items-center ${currentOwners.includes(owner) ? 'text-brand-600 font-medium bg-brand-50' : 'text-slate-600'}`}
                  >
                    {owner}
                    {currentOwners.includes(owner) && <CheckCircle2 size={10} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const updateActionQuarter = (actionId: string, targetQuarter: string | undefined) => {
    const newObjectives = data.objectives.map(obj => ({
      ...obj,
      strategies: obj.strategies.map(strat => ({
        ...strat,
        actions: strat.actions.map(act => {
          if (act.id === actionId) {
             return { ...act, deadline: targetQuarter || '' };
          }
          return act;
        })
      }))
    }));
    updateData({ objectives: newObjectives });
  };

  const handleDragStart = (e: React.DragEvent, actionId: string) => {
    setDraggedActionId(actionId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, quarter?: string) => {
    e.preventDefault();
    if (draggedActionId) {
      updateActionQuarter(draggedActionId, quarter);
      setDraggedActionId(null);
    }
  };

  const renderQuarterlyScheduleView = () => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const gridTemplateColumns = `250px repeat(4, minmax(140px, 1fr))`;
    const minTotalWidth = 250 + (4 * 140);

    return (
      <div className="w-full flex flex-col h-[600px] mt-8 border-t border-slate-200 pt-8">
        <div className="flex-shrink-0 mb-4 px-2">
          <h2 className="text-xl font-bold text-slate-800">季度排期 (Quarterly Schedule)</h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex-shrink-0 px-2 mb-4 flex space-x-2 overflow-x-auto pb-2 hide-scrollbar">
            <button
                onClick={() => setFilterOwner('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center ${
                    filterOwner === 'all' 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
                <Layers size={14} className="mr-1.5" />
                全局视图 (All)
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
            {getOwnersWithActions().map(owner => (
                <button
                    key={owner}
                    onClick={() => setFilterOwner(owner)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center ${
                        filterOwner === owner 
                        ? `ring-2 ring-offset-1 ring-offset-slate-50 ${OWNER_COLORS[owner]?.bg.replace('50', '100')} ${OWNER_COLORS[owner]?.text} border-transparent font-bold shadow-sm` 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${filterOwner === owner ? 'bg-current' : OWNER_COLORS[owner]?.bg.replace('bg-', 'bg-').replace('50', '400')}`}></span>
                    {owner}
                </button>
            ))}
        </div>

        <div className="flex-grow flex gap-4 overflow-hidden px-2 pb-2">
          {/* Sidebar: Unscheduled Tasks */}
          <div className="w-72 flex-shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-slate-700 flex items-center">
                <Filter size={14} className="mr-2 text-slate-400" />
                待安排任务
              </h3>
              {filterOwner !== 'all' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${OWNER_COLORS[filterOwner]?.badge}`}>
                     {filterOwner}
                  </span>
              )}
            </div>
            
            <div 
               className="flex-1 overflow-y-auto p-4 space-y-6"
               onDragOver={handleDragOver}
               onDrop={(e) => handleDrop(e, undefined)}
            >
              {data.objectives.map(obj => {
                const hasUnscheduled = obj.strategies.some(s => s.actions.some(a => 
                    (!a.deadline || !['Q1', 'Q2', 'Q3', 'Q4'].some(q => a.deadline.includes(q))) && 
                    (filterOwner === 'all' || (a.owners && a.owners.includes(filterOwner)))
                ));
                if (!hasUnscheduled) return null;

                return (
                  <div key={obj.id} className="space-y-3">
                    <div className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                       {obj.title}
                    </div>
                    {obj.strategies.map(strat => {
                      const actions = strat.actions.filter(a => 
                          (!a.deadline || !['Q1', 'Q2', 'Q3', 'Q4'].some(q => a.deadline.includes(q))) && 
                          (filterOwner === 'all' || (a.owners && a.owners.includes(filterOwner)))
                      );
                      if (actions.length === 0) return null;
                      return (
                        <div key={strat.id} className="pl-2 border-l-2 border-slate-200">
                          <div className="text-[11px] text-slate-500 font-medium mb-2 leading-tight">{strat.text}</div>
                          {actions.map(action => (
                            <DraggableAction key={action.id} action={action} onDragStart={handleDragStart} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
               
              {!data.objectives.some(o => o.strategies.some(s => s.actions.some(a => 
                  (!a.deadline || !['Q1', 'Q2', 'Q3', 'Q4'].some(q => a.deadline.includes(q))) && 
                  (filterOwner === 'all' || (a.owners && a.owners.includes(filterOwner)))
              ))) && (
                  <div className="text-center py-10 text-slate-400">
                      <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
                      <p className="text-sm">
                          {filterOwner === 'all' ? '所有任务已安排完毕' : `${filterOwner}的任务已安排完毕`}
                      </p>
                  </div>
              )}
            </div>
          </div>

          {/* Main: Calendar Matrix */}
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="flex-1 overflow-auto relative">
                <div style={{ minWidth: minTotalWidth }}>
                    {/* Matrix Header */}
                    <div className="sticky top-0 z-30 grid border-b border-slate-200 bg-slate-50 shadow-sm" 
                          style={{ gridTemplateColumns }}>
                        <div className="p-3 text-xs font-bold text-slate-500 uppercase flex items-center bg-slate-50 border-b border-slate-200">
                            策略 (Strategy)
                        </div>
                        {quarters.map(q => (
                            <div key={q} className="p-3 text-center text-xs font-bold text-slate-500 uppercase border-l border-slate-200 bg-slate-50 border-b">
                                {q}
                            </div>
                        ))}
                    </div>

                    {/* Matrix Body */}
                    <div>
                        {data.objectives.map(obj => (
                            <div key={obj.id} className="border-b border-slate-200 last:border-0">
                                <div className="sticky top-[41px] z-20 bg-slate-100/95 px-4 py-2 text-xs font-bold text-slate-800 border-b border-slate-200 backdrop-blur-sm shadow-sm flex items-center">
                                    Goal: {obj.title}
                                </div>

                                {obj.strategies.map(strat => (
                                    <div key={strat.id} className="grid group min-h-[100px]" 
                                        style={{ gridTemplateColumns }}>
                                        
                                        {/* Strategy Cell */}
                                        <div className="p-3 border-r border-slate-100 text-xs text-slate-600 bg-white">
                                            <div className="line-clamp-4 font-medium mb-1 leading-relaxed" title={strat.text}>{strat.text}</div>
                                        </div>

                                        {/* Quarter Cells */}
                                        {quarters.map(q => {
                                            const actions = strat.actions.filter(a => 
                                                a.deadline && a.deadline.includes(q) && 
                                                (filterOwner === 'all' || (a.owners && a.owners.includes(filterOwner)))
                                            );
                                            
                                            return (
                                                <div 
                                                    key={q} 
                                                    className="p-2 border-l border-slate-100 bg-white hover:bg-slate-50/50 transition-colors min-h-[100px]"
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, q)}
                                                >
                                                    {actions.map(action => (
                                                        <DraggableAction 
                                                            key={action.id} 
                                                            action={action} 
                                                            compact 
                                                            onDragStart={handleDragStart} 
                                                        />
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">落实行动</h2>
          <p className="text-slate-500">将策略转化为具体的行动计划，明确责任人与截止时间。</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center transition-colors ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutList size={16} className="mr-1.5" /> 列表视图
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center transition-colors ${viewMode === 'calendar' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CalendarDays size={16} className="mr-1.5" /> 季度排期
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        renderQuarterlyScheduleView()
      ) : (
        <div className="space-y-6">
          {data.objectives.map((obj, idx) => (
            <div key={obj.id} className="bg-white rounded-xl shadow-sm border border-slate-200">
              {/* Objective Header */}
              <div 
                  className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors rounded-t-xl"
                  onClick={() => toggleObjective(obj.id)}
              >
                 <div className="flex items-center space-x-3">
                   <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">{idx + 1}</span>
                   <h3 className="text-base font-bold text-slate-800">{obj.title}</h3>
                   <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {obj.strategies.length} 个策略
                   </span>
                 </div>
                 <div className="text-slate-400">
                   {expandedObjectives[obj.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                 </div>
              </div>
  
              {/* Strategies List */}
              {expandedObjectives[obj.id] && (
                  <div className="p-6 space-y-8 bg-slate-50/30">
                      {obj.strategies.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 italic">
                              暂无策略，请返回上一步添加策略。
                          </div>
                      ) : (
                          obj.strategies.map((strat, sIdx) => {
                              const hasActions = strat.actions && strat.actions.length > 0;
                              const showWarning = hasAttemptedSubmit && !hasActions;
                              
                              return (
                              <div key={strat.id} className={`bg-white rounded-lg border shadow-sm overflow-visible ${
                                showWarning ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                              }`}>
                                  {/* Strategy Header */}
                                  <div className={`p-4 border-b bg-white flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                                    showWarning ? 'border-amber-200 bg-amber-50' : 'border-slate-100'
                                  }`}>
                                      <div className="flex-1">
                                          <div className="flex items-start gap-2 mb-1">
                                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                                                showWarning ? 'text-amber-600 bg-amber-100' : 'text-brand-600 bg-brand-50'
                                              }`}>S{sIdx + 1}</span>
                                              <p className="text-sm font-medium text-slate-800 leading-relaxed">{strat.text}</p>
                                              {showWarning && (
                                                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                  <AlertCircle size={12} />
                                                  缺少行动项
                                                </span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-2 ml-8">
                                          </div>
                                      </div>
                                  </div>
  
                                  {/* Actions Table */}
                                  <div className="p-4 bg-slate-50/50">
                                      {strat.actions.length === 0 ? (
                                          <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded">
                                              暂无行动计划，请点击下方按钮添加。
                                          </div>
                                      ) : (
                                          <div className="space-y-3">
                                              {strat.actions.map((act, aIdx) => {
                                                  const actionIncomplete = hasAttemptedSubmit && !isActionComplete(act);
                                                  const missingFields = actionIncomplete ? getActionMissingFields(act) : [];
                                                  
                                                  return (
                                                  <div key={act.id} className={`flex flex-col md:flex-row gap-3 items-start md:items-center bg-white p-3 rounded border shadow-sm group transition-colors ${
                                                    actionIncomplete 
                                                      ? 'border-red-300 ring-2 ring-red-100' 
                                                      : 'border-slate-200 hover:border-brand-200'
                                                  }`}>
                                                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex-shrink-0">
                                                          {aIdx + 1}
                                                      </div>
                                                      
                                                      <div className="flex-grow w-full md:w-auto space-y-2">
                                                          <div className="relative">
                                                              <input 
                                                                  type="text"
                                                                  className={`w-full text-sm font-medium text-slate-700 bg-transparent border-none focus:ring-0 p-0 placeholder-slate-300 ${
                                                                    actionIncomplete && missingFields.includes('标题') ? 'placeholder-red-400' : ''
                                                                  }`}
                                                                  placeholder={actionIncomplete && missingFields.includes('标题') ? '请填写标题...' : '行动标题...'}
                                                                  value={act.title || ''}
                                                                  onChange={(e) => updateAction(obj.id, strat.id, act.id, { title: e.target.value })}
                                                              />
                                                              {actionIncomplete && missingFields.includes('标题') && (
                                                                <span className="absolute -right-2 top-0 text-red-500 text-xs">*</span>
                                                              )}
                                                          </div>
                                                          <div className="relative">
                                                              <textarea 
                                                                  className={`w-full text-xs text-slate-500 bg-slate-50 rounded border p-2 outline-none resize-none ${
                                                                    actionIncomplete && missingFields.includes('内容') 
                                                                      ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-200 placeholder-red-400' 
                                                                      : 'border-slate-100 focus:border-brand-300 focus:ring-1 focus:ring-brand-100'
                                                                  }`}
                                                                  rows={2}
                                                                  placeholder={actionIncomplete && missingFields.includes('内容') ? '请填写内容...' : '具体行动内容...'}
                                                                  value={act.content || act.text}
                                                                  onChange={(e) => {
                                                                      updateAction(obj.id, strat.id, act.id, { 
                                                                          content: e.target.value, 
                                                                          text: e.target.value 
                                                                      });
                                                                  }}
                                                              />
                                                              {actionIncomplete && missingFields.includes('内容') && (
                                                                <span className="absolute top-1 right-2 text-red-500 text-xs">*</span>
                                                              )}
                                                          </div>
                                                      </div>
  
                                                      <div className="flex flex-row md:flex-col gap-2 w-full md:w-48 flex-shrink-0">
                                                          {/* Owner Selector */}
                                                          <div className={`relative w-full ${actionIncomplete && missingFields.includes('负责人') ? 'ring-2 ring-red-200 rounded' : ''}`}>
                                                            {renderOwnerSelector(obj.id, strat.id, act)}
                                                            {actionIncomplete && missingFields.includes('负责人') && (
                                                              <span className="absolute -top-1 -right-1 text-red-500 text-xs bg-white px-1">*</span>
                                                            )}
                                                          </div>

                                                          {/* Deadline Selector */}
                                                          <div className={`w-full mt-2 md:mt-0 flex flex-col gap-2 ${actionIncomplete && missingFields.includes('时间排期') ? 'ring-2 ring-red-200 rounded' : ''}`}>
                                                              <div className="flex flex-wrap gap-1.5">
                                                                  {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                                                                      const parts = (act.deadline || '').split(',').map(s => s.trim()).filter(Boolean);
                                                                      const isSelected = parts.includes(q);
                                                                      return (
                                                                          <button
                                                                              key={q}
                                                                              type="button"
                                                                              onClick={() => {
                                                                                  let parts = (act.deadline || '').split(',').map(s => s.trim()).filter(Boolean);
                                                                                  const stdQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
                                                                                  const currentQuarters = parts.filter(p => stdQuarters.includes(p));
                                                                                  const customParts = parts.filter(p => !stdQuarters.includes(p));
                                                                                  let newQuarters: string[];
                                                                                  if (isSelected) {
                                                                                      newQuarters = currentQuarters.filter(x => x !== q);
                                                                                  } else {
                                                                                      newQuarters = [...currentQuarters, q].sort((a, b) => stdQuarters.indexOf(a) - stdQuarters.indexOf(b));
                                                                                  }
                                                                                  updateAction(obj.id, strat.id, act.id, { deadline: [...newQuarters, ...customParts].join(', ') });
                                                                              }}
                                                                              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                                                                                  isSelected
                                                                                      ? 'bg-brand-600 text-white border-brand-600'
                                                                                      : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600'
                                                                              }`}
                                                                          >
                                                                              {q}
                                                                          </button>
                                                                      );
                                                                  })}
                                                              </div>
                                                              <div className="flex items-center gap-1">
                                                                  <input
                                                                      type="text"
                                                                      className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-brand-300 text-slate-600 bg-white"
                                                                      placeholder="输入其他时间 (如: 每月)"
                                                                      value={customDeadlineInputs[act.id] || ''}
                                                                      onChange={(e) => setCustomDeadlineInputs(prev => ({ ...prev, [act.id]: e.target.value }))}
                                                                      onKeyDown={(e) => {
                                                                          if (e.key === 'Enter' && (customDeadlineInputs[act.id] || '').trim()) {
                                                                              const parts = (act.deadline || '').split(',').map(s => s.trim()).filter(Boolean);
                                                                              const stdQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
                                                                              const currentQuarters = parts.filter(p => stdQuarters.includes(p));
                                                                              const customParts = parts.filter(p => !stdQuarters.includes(p));
                                                                              customParts.push(customDeadlineInputs[act.id].trim());
                                                                              updateAction(obj.id, strat.id, act.id, { deadline: [...currentQuarters, ...customParts].join(', ') });
                                                                              setCustomDeadlineInputs(prev => ({ ...prev, [act.id]: '' }));
                                                                          }
                                                                      }}
                                                                  />
                                                                  <button
                                                                      type="button"
                                                                      onClick={() => {
                                                                          const val = (customDeadlineInputs[act.id] || '').trim();
                                                                          if (!val) return;
                                                                          const parts = (act.deadline || '').split(',').map(s => s.trim()).filter(Boolean);
                                                                          const stdQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
                                                                          const currentQuarters = parts.filter(p => stdQuarters.includes(p));
                                                                          const customParts = parts.filter(p => !stdQuarters.includes(p));
                                                                          customParts.push(val);
                                                                          updateAction(obj.id, strat.id, act.id, { deadline: [...currentQuarters, ...customParts].join(', ') });
                                                                          setCustomDeadlineInputs(prev => ({ ...prev, [act.id]: '' }));
                                                                      }}
                                                                      disabled={!(customDeadlineInputs[act.id] || '').trim()}
                                                                      className="px-2.5 py-1.5 text-xs font-medium rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                                                  >
                                                                      添加
                                                                  </button>
                                                              </div>
                                                              {/* Show current combined deadline */}
                                                              {(act.deadline || '').trim() && (
                                                                  <div className="flex flex-wrap gap-1 items-center">
                                                                      <span className="text-[10px] text-slate-400">已选:</span>
                                                                      {(act.deadline || '').split(',').map(s => s.trim()).filter(Boolean).map((part, i) => (
                                                                          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                                                                              {part}
                                                                              <button
                                                                                  type="button"
                                                                                  onClick={() => {
                                                                                      const parts = (act.deadline || '').split(',').map(s => s.trim()).filter(Boolean);
                                                                                      const newParts = parts.filter(p => p !== part);
                                                                                      updateAction(obj.id, strat.id, act.id, { deadline: newParts.join(', ') });
                                                                                  }}
                                                                                  className="ml-0.5 text-slate-400 hover:text-red-500"
                                                                              >
                                                                                  <X size={10} />
                                                                              </button>
                                                                          </span>
                                                                      ))}
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
  
                                                      <button 
                                                          onClick={() => removeAction(obj.id, strat.id, act.id)}
                                                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors self-start md:self-center"
                                                      >
                                                          <Trash2 size={16} />
                                                      </button>
                                                  </div>
                                              )})}
                                          </div>
                                      )}
                                      
                                      <button
                                          onClick={() => addCustomAction(obj.id, strat.id)}
                                          className="mt-3 w-full py-2 flex items-center justify-center text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-100 border-dashed rounded transition-colors"
                                      >
                                          <Plus size={14} className="mr-1.5" />
                                          添加行动
                                      </button>
                                  </div>
                              </div>
                          )})
                      )}
                  </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 顶部居中的验证错误提示 */}
      {validationError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-fade-in">
          <AlertCircle size={18} />
          {validationError}
        </div>
      )}

      <div className="flex justify-between pt-6 border-t border-slate-100">
        <button onClick={onBack} className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
          上一步
        </button>
        <button
          onClick={handleNextClick}
          className={`px-8 py-2.5 rounded-xl font-medium shadow-lg transition-colors flex items-center ${
            allStrategiesHaveActions()
              ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200'
              : 'bg-slate-400 hover:bg-slate-500 text-white shadow-slate-200'
          }`}
        >
          下一步：规划预算 <ArrowRight size={16} className="ml-2" />
        </button>
      </div>
    </div>
  );
};

export default ActionStep;
