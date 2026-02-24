import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  description?: string;
  children: ReactNode;
};

export const SettingItem: React.FC<Props> = ({ label, description, children }) => {
  return (
    <div
      className={cn(
        'flex items-center p-4 border border-gray-200 bg-white rounded-xl hover:border-gray-300'
      )}
    >
      <div className="flex-1">
        <div className="font-semibold text-gray-900">{label}</div>
        {description ? (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        ) : null}
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  );
};

export default SettingItem;
