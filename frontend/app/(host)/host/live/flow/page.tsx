'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import type { Event } from '@/types/domain';
import { ListChecks, Clock, Play, Pause, CheckCircle } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';

type FlowStatus = 'pending' | 'active' | 'completed';

interface FlowStep {
  id: string;
  title: string;
  duration: number; // in minutes
  status: FlowStatus;
}

export default function FlowControlPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Sample flow steps - in production, this would come from the database
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([
    { id: '1', title: '签到入场', duration: 30, status: 'completed' },
    { id: '2', title: '开场致辞', duration: 10, status: 'active' },
    { id: '3', title: '破冰活动', duration: 20, status: 'pending' },
    { id: '4', title: '1v1配对', duration: 60, status: 'pending' },
    { id: '5', title: '小组讨论', duration: 45, status: 'pending' },
    { id: '6', title: '总结分享', duration: 15, status: 'pending' },
  ]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await getEvents();
        setEvents(eventsData);
        if (eventsData.length > 0) {
          setSelectedEventId(eventsData[0].event_id);
        }
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const handleStepStatusChange = (stepId: string, newStatus: FlowStatus) => {
    setFlowSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, status: newStatus } : step))
    );
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const activeStep = flowSteps.find((s) => s.status === 'active');
  const completedCount = flowSteps.filter((s) => s.status === 'completed').length;
  const totalDuration = flowSteps.reduce((sum, step) => sum + step.duration, 0);

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ListChecks className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">流程控制</h1>
          </div>

          {/* Event Selector */}
          {events.length > 0 && (
            <CustomSelect
              options={events.map((event) => ({
                value: event.event_id,
                label: event.name,
              }))}
              value={selectedEventId}
              onChange={setSelectedEventId}
              placeholder="选择活动"
              className="w-full md:w-auto md:min-w-[300px]"
            />
          )}
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="text-sm text-muted-foreground mb-2">当前环节</div>
            <div className="text-xl font-bold text-primary">
              {activeStep ? activeStep.title : '未开始'}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="text-sm text-muted-foreground mb-2">进度</div>
            <div className="text-3xl font-bold text-foreground">
              {completedCount}/{flowSteps.length}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="text-sm text-muted-foreground mb-2">总时长</div>
            <div className="text-3xl font-bold text-foreground">{totalDuration}分钟</div>
          </div>
        </div>

        {/* Flow Steps */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">活动流程</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {flowSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-lg border transition-all ${
                    step.status === 'active'
                      ? 'border-primary bg-primary/5'
                      : step.status === 'completed'
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                          step.status === 'active'
                            ? 'bg-primary text-white'
                            : step.status === 'completed'
                            ? 'bg-green-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{step.title}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{step.duration}分钟</span>
                          {step.status === 'active' && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                              进行中
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center gap-2">
                      {step.status === 'pending' && (
                        <button
                          onClick={() => handleStepStatusChange(step.id, 'active')}
                          className="px-4 py-2 rounded-button bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          开始
                        </button>
                      )}
                      {step.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleStepStatusChange(step.id, 'pending')}
                            className="px-4 py-2 rounded-button border border-border hover:bg-muted transition-colors flex items-center gap-2"
                          >
                            <Pause className="w-4 h-4" />
                            暂停
                          </button>
                          <button
                            onClick={() => handleStepStatusChange(step.id, 'completed')}
                            className="px-4 py-2 rounded-button bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            完成
                          </button>
                        </>
                      )}
                      {step.status === 'completed' && (
                        <span className="px-4 py-2 rounded-button bg-green-100 text-green-700 font-medium">
                          已完成
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
