import React from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'danger' | 'warning' | 'success';
  children: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ variant = 'default', className, children, ...props }) => {
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  const icons = {
    default: Info,
    danger: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
  };

  const Icon = icons[variant];

  return (
    <div
      className={cn(
        'relative w-full rounded-lg border p-4 flex items-start gap-3',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default Alert;
