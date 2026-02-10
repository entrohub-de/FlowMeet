import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import type { Topic, TopicCategory } from '@/types/domain';

interface TopicListProps {
  topics: Topic[];
}

const categoryConfig: Record<
  TopicCategory,
  { icon: string; label: string; color: string; bgColor: string }
> = {
  icebreaker: {
    icon: '🧊',
    label: 'topic.icebreaker',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  interests: {
    icon: '🎯',
    label: 'topic.interests',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  professional: {
    icon: '💼',
    label: 'topic.professional',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  deep_talk: {
    icon: '💭',
    label: 'topic.deepTalk',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
};

export function TopicList({ topics }: TopicListProps) {
  const { t } = useTranslation();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Group topics by category
  const groupedTopics = topics.reduce((acc, topic, index) => {
    if (!acc[topic.category]) {
      acc[topic.category] = [];
    }
    acc[topic.category].push({ ...topic, originalIndex: index });
    return acc;
  }, {} as Record<TopicCategory, (Topic & { originalIndex: number })[]>);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="space-y-6">
      {(Object.keys(categoryConfig) as TopicCategory[]).map((category) => {
        const categoryTopics = groupedTopics[category];
        if (!categoryTopics || categoryTopics.length === 0) return null;

        const config = categoryConfig[category];

        return (
          <div key={category} className="space-y-3">
            {/* Category Header */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{config.icon}</span>
              <h3 className={`font-semibold ${config.color}`}>
                {t(config.label)}
              </h3>
              <div className={`h-px flex-1 ${config.bgColor}`} />
            </div>

            {/* Topics in this category */}
            <div className="space-y-2">
              {categoryTopics.map((topic) => (
                <div
                  key={topic.originalIndex}
                  className={`${config.bgColor} border border-border rounded-lg p-4 hover:shadow-sm transition-shadow`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-foreground font-medium mb-1">
                        {topic.question}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {topic.reasoning}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(topic.question, topic.originalIndex)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-background"
                      title="Copy to clipboard"
                    >
                      {copiedIndex === topic.originalIndex ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
