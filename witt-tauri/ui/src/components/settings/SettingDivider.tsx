import React from 'react';
import { cn } from '@/lib/utils';

type SettingDividerProps = {
  label?: string;
};

const SettingDivider: React.FC<SettingDividerProps> = ({ label }) => {
  if (label) {
    return (
      <div className={cn('flex items-center my-6')}>
        <span className={cn('flex-1 border-t border-gray-200')} />
        <span className={cn('mx-4 text-sm font-medium text-gray-500 uppercase tracking-wide')}>{label}</span>
        <span className={cn('flex-1 border-t border-gray-200')} />
      </div>
    );
  }
  return <div className={cn('border-t border-gray-200 my-6')} />;
};

export default SettingDivider;
