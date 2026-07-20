import React, { useMemo, useState } from 'react';
import { JBPData, JBPAction } from '../types';
import { GripVertical, Layers, ArrowRight, CheckCircle2, User, Filter } from 'lucide-react';
import { OWNER_COLORS, ACTION_OWNERS } from '../constants';

interface CalendarStepProps {
  data: JBPData;
  updateData: (updates: Partial<JBPData>) => void;
}

interface DraggableActionProps {
  action: JBPAction;
  compact?: boolean;
  onDragStart: (e: React.DragEvent, actionId: string) => void;
  isContinuation?: boolean;
}

const DraggableAction: React.FC<DraggableActionProps> = ({ action, compact = false, onDragStart, isContinuation = false }) => {
  // Get color styles for this owner
  const colors = OWNER_COLORS[action.owner] || { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-500' };

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
            <div className="flex items-center justify-between mt-1.5">
               {/* Owner Badge - Only show in sidebar or if we decide to ungroup later. In grouped view, the header handles this. */}
               {!compact && (
                 <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.badge}`}>
                   {action.owner}
                 </span>
               )}
               {action.estimatedCost && (
                  <span className="text-[10px] font-bold text-slate-500 ml-auto flex items-center bg-white/50 px-1 rounded">
                     <span className="mr-0.5">¥</span>{action.estimatedCost}
                  </span>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CalendarStep: React.FC<CalendarStepProps> = ({ data, updateData }) => {
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  const [filterOwner, setFilterOwner] = useState<string>('all');

  // Generate months based on period
  const months = useMemo(() => {
    const period = data.period;
    let startMonth = 1;
    let year = 2024;
    let count = 3;

    if (period.includes('2024')) year = 2024;
    if (period.includes('2025')) year = 2025;
    if (period.includes('2026')) year = 2026;
    if (period.includes('2027')) year = 2027;

    if (period.includes('Q3')) { startMonth = 7; count = 3; }
    else if (period.includes('Q4')) { startMonth = 10; count = 3; }
    else if (period.includes('Q1')) { startMonth = 1; count = 3; }
    else if (period.includes('FY')) { 
      startMonth = 12; 
      count = 12;
      year--; // FY starts from Dec of previous year
    }

    const ms = [];
    for (let i = 0; i < count; i++) {
      let m = startMonth + i;
      let y = year;
      if (m > 12) { m -= 12; y++; }
      ms.push({
        id: `${y}-${String(m).padStart(2, '0')}`,
        label: `${y}年${m}月`,
        shortLabel: `${m}月`
      });
    }
    return ms;
  }, [data.period]);

  const isActionInMonth = (action: JBPAction, monthId: string) => {
      if (action.startMonth && action.endMonth) {
          return monthId >= action.startMonth && monthId <= action.endMonth;
      }
      return false;
  };

  const updateActionMonth = (actionId: string, targetMonthId: string | undefined) => {
    const newObjectives = data.objectives.map(obj => ({
      ...obj,
      strategies: obj.strategies.map(strat => ({
        ...strat,
        actions: strat.actions.map(act => {
          if (act.id === actionId) {
             if (!targetMonthId) {
                 return { ...act, startMonth: undefined, endMonth: undefined };
             }
             return { 
                 ...act, 
                 startMonth: targetMonthId, 
                 endMonth: targetMonthId
             };
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

  const handleDrop = (e: React.DragEvent, monthId?: string) => {
    e.preventDefault();
    if (draggedActionId) {
      updateActionMonth(draggedActionId, monthId);
      setDraggedActionId(null);
    }
  };

  const gridTemplateColumns = `250px repeat(${months.length}, minmax(140px, 1fr))`;
  const minTotalWidth = 250 + (months.length * 140);

  return (
    <div className="w-full flex flex-col h-[600px] mt-8 border-t border-slate-200 pt-8">
      <div className="flex-shrink-0 mb-4 px-2">
        <h2 className="text-xl font-bold text-slate-800">行事日历与排期 (Activity Calendar)</h2>
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
          {ACTION_OWNERS.map(owner => (
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
                  (!a.startMonth) && 
                  (filterOwner === 'all' || a.owner === filterOwner)
              ));
              if (!hasUnscheduled) return null;

              return (
                <div key={obj.id} className="space-y-3">
                  <div className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                     {obj.title}
                  </div>
                  {obj.strategies.map(strat => {
                    const actions = strat.actions.filter(a => 
                        (!a.startMonth) && 
                        (filterOwner === 'all' || a.owner === filterOwner)
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
                (!a.startMonth) && 
                (filterOwner === 'all' || a.owner === filterOwner)
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
                      {months.map(m => (
                          <div key={m.id} className="p-3 text-center text-xs font-bold text-slate-500 uppercase border-l border-slate-200 bg-slate-50 border-b">
                              {m.label}
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
                                          {strat.measure && (
                                              <div className="text-[10px] text-slate-400 bg-slate-50 p-1.5 rounded border border-slate-100 mt-2">
                                                  M: {strat.measure}
                                              </div>
                                          )}
                                      </div>

                                      {/* Month Cells - Grouped by Owner */}
                                      {months.map(m => {
                                          // FILTER: Only show actions that match the month AND the selected filter owner
                                          const actions = strat.actions.filter(a => 
                                              isActionInMonth(a, m.id) && 
                                              (filterOwner === 'all' || a.owner === filterOwner)
                                          );
                                          
                                          // Group actions by owner (Visual Grouping)
                                          const groupedActions: Record<string, JBPAction[]> = {};
                                          ACTION_OWNERS.forEach(owner => {
                                              const ownerActions = actions.filter(a => a.owner === owner);
                                              if (ownerActions.length > 0) {
                                                  groupedActions[owner] = ownerActions;
                                              }
                                          });

                                          return (
                                              <div 
                                                  key={m.id}
                                                  onDragOver={handleDragOver}
                                                  onDrop={(e) => handleDrop(e, m.id)}
                                                  className={`
                                                      p-1.5 border-r border-slate-100 last:border-0 transition-colors
                                                      ${actions.length > 0 ? 'bg-white' : 'bg-slate-50/30'}
                                                      hover:bg-indigo-50/50 relative flex flex-col
                                                  `}
                                              >
                                                  {Object.keys(groupedActions).length > 0 ? (
                                                      <div className="space-y-2 h-full">
                                                          {Object.keys(groupedActions).map(owner => {
                                                              const ownerColors = OWNER_COLORS[owner];
                                                              return (
                                                                  <div key={owner} className={`rounded overflow-hidden border ${ownerColors ? ownerColors.border : 'border-slate-100'}`}>
                                                                      {/* Owner Header (Tiny) - Only show if in 'all' mode to reduce noise, or always show if preferred. 
                                                                          Here we keep it to maintain context, but if single filter, it's redundant but harmless.
                                                                          Let's keep it for visual consistency.
                                                                      */}
                                                                      <div className={`text-[9px] px-1 py-0.5 font-bold uppercase tracking-wider ${ownerColors ? ownerColors.badge : 'bg-slate-100 text-slate-500'} flex items-center`}>
                                                                          <User size={8} className="mr-1"/> {owner}
                                                                      </div>
                                                                      {/* Actions for this owner */}
                                                                      <div className={`p-1 ${ownerColors ? ownerColors.bg : 'bg-white'}`}>
                                                                          {groupedActions[owner].map(action => (
                                                                              <DraggableAction 
                                                                                  key={action.id} 
                                                                                  action={action} 
                                                                                  compact 
                                                                                  onDragStart={handleDragStart} 
                                                                                  isContinuation={action.startMonth !== m.id && !!action.startMonth}
                                                                              />
                                                                          ))}
                                                                      </div>
                                                                  </div>
                                                              );
                                                          })}
                                                      </div>
                                                  ) : (
                                                      <div className="h-full min-h-[80px]" />
                                                  )}
                                              </div>
                                          )
                                      })}
                                  </div>
                              ))}
                          </div>
                      ))}
                      
                      {data.objectives.length === 0 && (
                          <div className="text-center py-20 text-slate-400">
                              暂无目标和策略数据
                          </div>
                      )}
                  </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarStep;
