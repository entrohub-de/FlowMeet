'use client';

import { useTranslation } from '@/lib/i18n/context';
import { Expectation } from '@/types/domain';
import { parseExpectationContent, getTagI18nKey } from '@/lib/expectation-templates';

interface ExpectationsListProps {
  expectations: Expectation[];
}

export function ExpectationsList({ expectations }: ExpectationsListProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">{t('user.allExpectations')}</h2>
      {expectations.length > 0 ? (
        <div className="space-y-4">
          {expectations.map((expectation) => {
            const data = parseExpectationContent(expectation.content);
            return (
              <div
                key={expectation.expectation_id}
                className="border-l-4 border-primary pl-4 py-2 space-y-2"
              >
                {data.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {data.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium"
                      >
                        {t(getTagI18nKey(tag))}
                      </span>
                    ))}
                  </div>
                )}
                {data.text && (
                  <p className="text-sm text-foreground">{data.text}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(expectation.created_at).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">{t('user.noExpectations')}</p>
      )}
    </div>
  );
}
