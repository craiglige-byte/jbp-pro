import React from 'react';
import { WizardStep } from '../types';
import { CheckCircle2, Circle } from 'lucide-react';

interface StepWizardProps {
  currentStep: WizardStep;
  setStep: (step: WizardStep) => void;
  canNavigate: (targetStep: WizardStep) => boolean;
  steps: { id: WizardStep; label: string; code: string }[];
}

// Default step definitions (used as fallback)
const ALL_STEPS: { id: WizardStep; label: string; code: string }[] = [
  { id: 'info', label: '基本信息', code: 'Info' },
  { id: 'business_review', label: '经营回顾', code: 'Review' },
  { id: 'objectives', label: '设定目标 (G)', code: 'Goals' },
  { id: 'strategies', label: '拆解策略(S&M)', code: 'Strat' },
  { id: 'actions', label: '落实行动(T)', code: 'Tactics' },
  { id: 'budget', label: '规划预算(Budget)', code: 'Budget' },
  { id: 'review', label: '预览计划', code: 'Preview' },
];

const StepWizard: React.FC<StepWizardProps> = ({ currentStep, setStep, canNavigate, steps }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);
  return (
    <div className="w-full py-2 px-4 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
            {/* Desktop Steps */}
            <div className="hidden md:flex w-full justify-between items-center relative">
               <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200" />
               {steps.map((step, index) => {
                 const isActive = step.id === currentStep;
                 const isCompleted = index < currentIndex;
                 const isClickable = canNavigate(step.id);

                 return (
                   <div key={step.id} className="relative flex flex-col items-center bg-white px-2">
                     <div className={`
                       w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 border-2
                       ${isActive ? 'border-brand-600 bg-brand-50 text-brand-600 scale-110' :
                         isCompleted ? 'border-brand-600 bg-brand-600 text-white' :
                         isClickable ? 'border-slate-300 text-slate-300' : 'border-slate-200 text-slate-300 opacity-50'}
                     `}>
                       {isCompleted ? <CheckCircle2 size={14} /> : <Circle size={10} fill={isActive ? "currentColor" : "none"} />}
                     </div>
                     <span className={`mt-1 text-[11px] font-medium transition-colors ${isActive ? 'text-brand-700' : isCompleted ? 'text-slate-700' : isClickable ? 'text-slate-400' : 'text-slate-300'}`}>
                       {step.label}
                     </span>
                   </div>
                 );
               })}
            </div>

            {/* Mobile Steps */}
            <div className="md:hidden flex items-center justify-between w-full">
              <span className="text-sm font-semibold text-brand-700">
                {steps[currentIndex].code}: {steps[currentIndex].label}
              </span>
              <div className="flex space-x-1">
                {steps.map((_, idx) => (
                  <div key={idx} className={`h-1.5 w-4 rounded-full ${idx <= currentIndex ? 'bg-brand-500' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StepWizard;