'use client';

import { useTranslation } from '@/lib/i18n/context';
import { Expectation } from '@/types/domain';

interface ExpectationsListProps {
  expectations: Expectation[];
}

export function ExpectationsList({ expectations }: ExpectationsListProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold mb-4">{t('user.allExpectations')}</h2>
      {expectations.length > 0 ? (
        <div className="space-y-4">
          {expectations.map((expectation) => (
            <div
              key={expectation.expectation_id}
              className="border-l-4 border-blue-500 pl-4 py-2"
            >
              <p className="text-gray-800">{expectation.content}</p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(expectation.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">{t('user.noExpectations')}</p>
      )}
    </div>
  );
}
