import React from 'react';
import { useEpub } from '../context/EpubContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { notification } = useEpub();

  if (!notification) return null;

  return (
    <div className="toast-container">
      <div className={`toast toast-${notification.type}`}>
        <span className="toast-icon">
          {notification.type === 'success' && <CheckCircle2 size={18} />}
          {notification.type === 'error' && <AlertCircle size={18} />}
          {notification.type === 'info' && <Info size={18} />}
        </span>
        <span>{notification.message}</span>
      </div>
    </div>
  );
};
