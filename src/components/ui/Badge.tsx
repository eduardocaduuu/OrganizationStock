import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'success';
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'default', className, children, ...props }) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border-gray-300',
    danger: 'bg-red-100 text-red-800 border-red-300',
    warning: 'bg-orange-100 text-orange-800 border-orange-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
    success: 'bg-green-100 text-green-800 border-green-300',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Badge;
